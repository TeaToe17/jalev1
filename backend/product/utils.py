import math
from decimal import Decimal

def calculate_monthly_click_bill(
    eligible_clicks: int,
    product_price: float,
    debug: bool = False,
) -> dict:
    """
    Calculate a JAle seller's monthly advertising bill.

    Args:
        eligible_clicks: Number of valid, billable clicks.
        product_price: Product selling price in naira.
        debug: Print calculation breakdown when True.

    Returns:
        Dictionary containing CPC and monthly bill.
    """

    MIN_CPC = 10.0
    MAX_CPC = 100.0
    REFERENCE_PRICE = 25_000.0
    GROWTH_FACTOR = 20.0

    # 1. Validate inputs
    if isinstance(eligible_clicks, bool) or not isinstance(eligible_clicks, int):
        raise TypeError("eligible_clicks must be an integer.")

    if eligible_clicks < 0:
        raise ValueError("eligible_clicks cannot be negative.")

    # 1. Validate product price
    if isinstance(product_price, bool) or not isinstance(
        product_price, (int, float, Decimal)
    ):
        raise TypeError("product_price must be a finite number.")

    product_price = Decimal(str(product_price))

    if not product_price.is_finite():
        raise ValueError("product_price must be a finite number.")

    if product_price <= 0:
        raise ValueError("product_price must be greater than zero.")

    # Convert to float for logarithmic calculations
    product_price = float(product_price)

    # 2. Calculate raw CPC
    price_ratio = product_price / REFERENCE_PRICE
    logarithmic_value = math.log10(price_ratio)

    raw_cpc = MIN_CPC + (GROWTH_FACTOR * logarithmic_value)

    # 3. Apply CPC limits
    capped_cpc = max(MIN_CPC, min(MAX_CPC, raw_cpc))

    # 4. Round CPC to nearest naira (half-up)
    cost_per_click = math.floor(capped_cpc + 0.5)

    # 5. Calculate monthly bill
    bill = eligible_clicks * cost_per_click

    # 6. Debug output
    if debug:
        print("\n========== JALE CLICK BILL DEBUG ==========")
        print(f"Eligible clicks:       {eligible_clicks:,}")
        print(f"Product price:         ₦{product_price:,.2f}")
        print("-------------------------------------------")
        print(f"Reference price:       ₦{REFERENCE_PRICE:,.2f}")
        print(f"Price ratio:           {price_ratio:.4f}")
        print(f"Logarithmic value:     {logarithmic_value:.4f}")
        print(f"Growth factor:         {GROWTH_FACTOR}")
        print(f"Raw CPC:               ₦{raw_cpc:,.2f}")
        print(f"CPC after cap:         ₦{capped_cpc:,.2f}")
        print(f"Final CPC:             ₦{cost_per_click:,.2f}")
        print("-------------------------------------------")
        print(f"Calculation:           {eligible_clicks} × ₦{cost_per_click}")
        print(f"MONTHLY BILL:          ₦{bill:,.2f}")
        print("===========================================\n")

    return {
        "eligible_clicks": eligible_clicks,
        "product_price": product_price,
        "cost_per_click": cost_per_click,
        "bill": bill,
        "currency": "NGN",
    }


# Example usage
# result = calculate_monthly_click_bill(
#     eligible_clicks=100,
#     product_price=500_000,
#     debug=True,
# )

# print("Returned result:")
# print(result)