from app.services.ta_onboarding_service import onboard_ta
from app.services.faculty_onboarding_service import onboard_faculty

def complete_onboarding(user_id: int, role: str, data):
    if role == "student":
        return onboard_ta(user_id, data)
    elif role == "faculty":
        return onboard_faculty(user_id, data)
    else:
        raise ValueError("Unsupported role for onboarding")
