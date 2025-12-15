from pydantic import BaseModel, Field
from typing import Optional, List, Literal

class Weights(BaseModel):
    ta_pref: float
    prof_pref: float
    course_pref: float
    workload_balance: float

class LoginRequestModel(BaseModel):
    username: str
    password: str

class RegisterRequestModel(BaseModel):
    name: str
    username: str
    password: str
    role: Literal['student', 'faculty']

class Course(BaseModel):
    course_id: int
    course_code: str
    ps_lab_sections: Optional[str] = None
    enrollment_capacity: Optional[int] = None
    actual_enrollment: Optional[int] = None
    num_tas_requested: Optional[int] = None
    assigned_tas_count: Optional[int] = None
    skills: List[str] = []
    assignedTAs: List[str] = []



class TAOnboardingRequest(BaseModel):
    user_id: int

    # Basic profile (REQUIRED for algorithm)
    name: str = Field(min_length=2)
    program: str
    level: str                
    background: str
    admit_term: str
    standing: int
    max_hours: int = Field(gt=0)

    skills: List[str] = Field(min_items=1)
    preferred_professors: List[int] = Field(min_items=1)


class FacultyOnboardingRequest(BaseModel):
    user_id: int

    name: str = Field(min_length=2)

    preferred_tas: List[int] = Field(default_factory=list)
