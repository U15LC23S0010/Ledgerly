from datetime import date

def get_today() -> date:
    """
    Return today's date.
    """
    return date.today()

def get_current_month_range():
    """
    Return the start date of the current month
    and the start date of the next month.

    Example:
        2026-08-01
        2026-09-01
    """

    today = date.today()

    start_date = today.replace(day=1)

    if today.month == 12:
        next_month = date(
            today.year + 1,
            1,
            1
        )
    else:
        next_month = date(
            today.year,
            today.month + 1,
            1
        )

    return start_date, next_month


def get_month_range(year: int, month: int):
    """
    Return the start date of a given month
    and the start date of the following month.

    Example:
        get_month_range(2026, 8)

        returns:
            2026-08-01
            2026-09-01
    """

    start_date = date(
        year,
        month,
        1
    )

    if month == 12:
        next_month = date(
            year + 1,
            1,
            1
        )
    else:
        next_month = date(
            year,
            month + 1,
            1
        )

    return start_date, next_month
