use super::*;

const START: f64 = 1_000_000.0;
const MIN: f64 = 60.0;
const HOUR: f64 = 3600.0;

const IDLE_10: MonitorConfig = MonitorConfig {
    idle_after: Some(10.0 * MIN),
    forgotten_hours: None,
    auto_stop_minute: None,
};

fn tick(now: f64, idle: f64) -> Tick {
    Tick {
        now,
        idle,
        utc_offset: 0.0,
        running_start: Some(START),
    }
}

#[test]
fn asks_on_return_after_idle_past_the_threshold() {
    let mut monitor = Monitor::default();
    assert!(monitor.tick(IDLE_10, tick(START + 60.0, 5.0)).is_empty());
    // Last input at START + 55, idle for 12 minutes: nothing yet, the user is away.
    assert!(
        monitor
            .tick(IDLE_10, tick(START + 55.0 + 12.0 * MIN, 12.0 * MIN))
            .is_empty()
    );
    let back = monitor.tick(IDLE_10, tick(START + 40.0 * MIN, 3.0));
    assert_eq!(
        back,
        vec![MonitorEvent::IdleReturned {
            since: START + 55.0,
            returned: START + 40.0 * MIN - 3.0
        }]
    );
    assert!(
        monitor
            .tick(IDLE_10, tick(START + 41.0 * MIN, 3.0))
            .is_empty()
    );
}

#[test]
fn short_breaks_and_disabled_idle_never_ask() {
    let mut monitor = Monitor::default();
    assert!(
        monitor
            .tick(IDLE_10, tick(START + 5.0 * MIN, 4.0 * MIN))
            .is_empty()
    );
    assert!(
        monitor
            .tick(IDLE_10, tick(START + 6.0 * MIN, 1.0))
            .is_empty()
    );
    let off = MonitorConfig::default();
    assert!(
        monitor
            .tick(off, tick(START + 60.0 * MIN, 50.0 * MIN))
            .is_empty()
    );
    assert!(monitor.tick(off, tick(START + 61.0 * MIN, 1.0)).is_empty());
}

#[test]
fn a_long_sleep_counts_as_idle_from_the_last_activity() {
    let mut monitor = Monitor::default();
    monitor.tick(IDLE_10, tick(START + 10.0 * MIN, 2.0));
    // The Mac slept for an hour; right after waking the user typed.
    let back = monitor.tick(IDLE_10, tick(START + 70.0 * MIN, 1.0));
    assert_eq!(
        back,
        vec![MonitorEvent::IdleReturned {
            since: START + 10.0 * MIN - 2.0,
            returned: START + 70.0 * MIN - 1.0
        }]
    );
}

#[test]
fn reminds_every_period_of_forgotten_hours() {
    let config = MonitorConfig {
        forgotten_hours: Some(4),
        ..MonitorConfig::default()
    };
    let mut monitor = Monitor::default();
    assert!(
        monitor
            .tick(config, tick(START + 3.9 * HOUR, 1.0))
            .is_empty()
    );
    assert_eq!(
        monitor.tick(config, tick(START + 4.0 * HOUR, 1.0)),
        vec![MonitorEvent::Forgotten {
            hours: 4,
            last_activity: START + 4.0 * HOUR - 1.0
        }]
    );
    assert!(
        monitor
            .tick(config, tick(START + 5.0 * HOUR, 1.0))
            .is_empty()
    );
    assert_eq!(
        monitor.tick(config, tick(START + 8.1 * HOUR, 1.0)),
        vec![MonitorEvent::Forgotten {
            hours: 8,
            last_activity: START + 8.1 * HOUR - 1.0
        }]
    );
}

#[test]
fn auto_stops_at_the_last_activity_once_away_after_the_set_time() {
    // START is 1970-01-12 13:46:40 UTC; auto-stop at 18:00 UTC.
    let config = MonitorConfig {
        auto_stop_minute: Some(18 * 60),
        ..MonitorConfig::default()
    };
    let six_pm = 11.0 * 86_400.0 + 18.0 * HOUR;
    let mut monitor = Monitor::default();
    // Still working past 18:00: no stop.
    assert!(
        monitor
            .tick(config, tick(six_pm + 10.0 * MIN, 1.0))
            .is_empty()
    );
    // Left at 18:30, away for 6 minutes: stop at 18:30.
    let last = six_pm + 30.0 * MIN;
    monitor.tick(config, tick(last, 0.0));
    assert_eq!(
        monitor.tick(config, tick(last + 6.0 * MIN, 6.0 * MIN)),
        vec![MonitorEvent::AutoStop { at: last }]
    );
    assert!(
        monitor
            .tick(config, tick(last + 7.0 * MIN, 7.0 * MIN))
            .is_empty()
    );
}

#[test]
fn a_sleep_past_the_auto_stop_time_stops_at_the_activity_before_it() {
    let config = MonitorConfig {
        auto_stop_minute: Some(18 * 60),
        ..MonitorConfig::default()
    };
    let five_pm = 11.0 * 86_400.0 + 17.0 * HOUR;
    let mut monitor = Monitor::default();
    monitor.tick(config, tick(five_pm, 0.0));
    // The lid closed at 17:00; the next tick is at 09:00 with fresh input.
    let morning = five_pm + 16.0 * HOUR;
    assert_eq!(
        monitor.tick(config, tick(morning, 2.0)),
        vec![MonitorEvent::AutoStop { at: five_pm }]
    );
}

#[test]
fn a_new_running_entry_starts_fresh_and_idle_time_is_ignored() {
    let mut monitor = Monitor::default();
    monitor.tick(IDLE_10, tick(START + 20.0 * MIN, 15.0 * MIN));
    let fresh = Tick {
        running_start: Some(START + 30.0 * MIN),
        ..tick(START + 31.0 * MIN, 1.0)
    };
    assert!(monitor.tick(IDLE_10, fresh).is_empty());
    let stopped = Tick {
        running_start: None,
        ..tick(START + 32.0 * MIN, 1.0)
    };
    assert!(monitor.tick(IDLE_10, stopped).is_empty());
}

#[test]
fn config_reads_prefs_and_rejects_bad_times() {
    let prefs = Prefs {
        idle_minutes: 0,
        auto_stop: Some("18:30".into()),
        ..Prefs::default()
    };
    let config = config_of(&prefs);
    assert!(matches!(
        config,
        Ok(MonitorConfig {
            idle_after: None,
            forgotten_hours: Some(4),
            auto_stop_minute: Some(1110)
        })
    ));
    for bad in ["6pm", "24:00", "18:5", "18:60"] {
        let prefs = Prefs {
            auto_stop: Some(bad.into()),
            ..Prefs::default()
        };
        assert!(config_of(&prefs).is_err(), "{bad}");
    }
}
