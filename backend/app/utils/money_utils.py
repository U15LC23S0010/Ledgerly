from decimal import Decimal, InvalidOperation
from typing import Union


Number = Union[int, float, Decimal, str, None]


def to_decimal(value: Number) -> Decimal:
    """
    Convert a numeric value to Decimal safely.

    None or invalid values return Decimal("0").
    """

    if value is None:
        return Decimal("0")

    if isinstance(value, Decimal):
        return value

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def round_money(value: Number, decimals: int = 2) -> float:
    """
    Convert a value to money format and round it.

    Example:
        round_money(1250.567)
        -> 1250.57
    """

    amount = to_decimal(value)

    rounded = amount.quantize(
        Decimal("1." + "0" * decimals)
    )

    return float(rounded)


def money_to_float(value: Number) -> float:
    """
    Convert a money value safely to float.

    Example:
        money_to_float(None)
        -> 0.0
    """

    return float(to_decimal(value))


def money_to_decimal(value: Number) -> Decimal:
    """
    Return a money value as Decimal.
    """

    return to_decimal(value)


def add_money(*values: Number) -> Decimal:
    """
    Safely add multiple money values.

    Example:
        add_money(100, 200.50, 50)
        -> Decimal("350.50")
    """

    total = Decimal("0")

    for value in values:
        total += to_decimal(value)

    return total


def subtract_money(
    first: Number,
    second: Number,
) -> Decimal:
    """
    Safely subtract two money values.

    Example:
        subtract_money(1000, 250)
        -> Decimal("750")
    """

    return (
        to_decimal(first)
        - to_decimal(second)
    )
