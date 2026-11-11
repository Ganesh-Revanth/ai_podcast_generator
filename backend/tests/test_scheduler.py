import pytest
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.services.scheduler_service import (
    parse_schedule_trigger,
    schedule_show_job,
    remove_show_job,
    scheduler
)
from app.db import models

def test_parse_schedule_daily():
    trigger = parse_schedule_trigger("daily:09:30")
    assert isinstance(trigger, CronTrigger)
    # Check fields
    fields = {f.name: str(f) for f in trigger.fields}
    assert fields["hour"] == "9"
    assert fields["minute"] == "30"

def test_parse_schedule_hourly():
    trigger = parse_schedule_trigger("hourly")
    assert isinstance(trigger, IntervalTrigger)
    assert trigger.interval.total_seconds() == 3600

def test_parse_schedule_every_n_hours():
    trigger = parse_schedule_trigger("every_6_hours")
    assert isinstance(trigger, IntervalTrigger)
    assert trigger.interval.total_seconds() == 6 * 3600

def test_parse_schedule_every_n_minutes():
    trigger = parse_schedule_trigger("every_30_minutes")
    assert isinstance(trigger, IntervalTrigger)
    assert trigger.interval.total_seconds() == 30 * 60

def test_parse_schedule_cron():
    trigger = parse_schedule_trigger("0 15 * * 1-5")
    assert isinstance(trigger, CronTrigger)
    fields = {f.name: str(f) for f in trigger.fields}
    assert fields["hour"] == "15"
    assert fields["minute"] == "0"
    assert fields["day_of_week"] == "1-5"

def test_parse_schedule_fallback():
    trigger = parse_schedule_trigger("invalid_expression")
    assert isinstance(trigger, CronTrigger)
    fields = {f.name: str(f) for f in trigger.fields}
    assert fields["hour"] == "8"
    assert fields["minute"] == "0"

def test_schedule_and_remove_show_job():
    dummy_show = models.Show(
        id=9999,
        name="Test Dummy Show",
        schedule="hourly",
        enabled=True
    )

    schedule_show_job(dummy_show)
    job = scheduler.get_job("show_9999")
    assert job is not None
    assert "Test Dummy Show" in job.name

    # Disabling the show removes the job
    dummy_show.enabled = False
    schedule_show_job(dummy_show)
    assert scheduler.get_job("show_9999") is None

    # Re-enable and explicitly test remove_show_job
    dummy_show.enabled = True
    schedule_show_job(dummy_show)
    assert scheduler.get_job("show_9999") is not None

    remove_show_job(9999)
    assert scheduler.get_job("show_9999") is None

