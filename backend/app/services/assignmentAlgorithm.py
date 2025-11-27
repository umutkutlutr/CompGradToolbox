import numpy as np
from itertools import product

# Example data (to be replaced with DB data later)
TAs = {
    "TA1": {"prof_pref": ["ProfA", "ProfB", "ProfC"], "course_pref": ["Course1", "Course2"], "max_hours": 10},
    "TA2": {"prof_pref": ["ProfB", "ProfA", "ProfC"], "course_pref": ["Course2", "Course3"], "max_hours": 8},
    "TA3": {"prof_pref": ["ProfA", "ProfC", "ProfB"], "course_pref": ["Course1", "Course3"], "max_hours": 12},
    "TA4": {"prof_pref": ["ProfC", "ProfB", "ProfA"], "course_pref": ["Course3", "Course2"], "max_hours": 10},
    "TA5": {"prof_pref": ["ProfB", "ProfC", "ProfA"], "course_pref": ["Course2", "Course3"], "max_hours": 9},
    "TA6": {"prof_pref": ["ProfC", "ProfA", "ProfB"], "course_pref": ["Course3", "Course1"], "max_hours": 11},
}

Professors = {
    "ProfA": {"ta_pref": ["TA1", "TA3", "TA2", "TA5", "TA6", "TA4"], "num_TAs": 2, "course": "Course1"},
    "ProfB": {"ta_pref": ["TA2", "TA5", "TA1", "TA4", "TA3", "TA6"], "num_TAs": 2, "course": "Course2"},
    "ProfC": {"ta_pref": ["TA4", "TA6", "TA3", "TA2", "TA1", "TA5"], "num_TAs": 2, "course": "Course3"},
}

# CRITERIA
weights = {
    "ta_pref": 0.4,
    "prof_pref": 0.3,
    "course_pref": 0.2,
    "workload_balance": 0.1
}


# Step 1: Normalize ranks to scores
def rank_to_score(rank, max_rank):
    return (max_rank - rank) / max_rank


# Step 2: Compute weighted score for a TA-Prof pair 
def compute_weighted_score(ta_name, prof_name, current_workload, avg_workload):
    ta = TAs[ta_name]
    prof = Professors[prof_name]
    
    # TA preference for professor
    ta_rank = ta["prof_pref"].index(prof_name) if prof_name in ta["prof_pref"] else len(ta["prof_pref"])
    ta_score = rank_to_score(ta_rank, len(ta["prof_pref"]))

    # Professor preference for TA
    prof_rank = prof["ta_pref"].index(ta_name) if ta_name in prof["ta_pref"] else len(prof["ta_pref"])
    prof_score = rank_to_score(prof_rank, len(prof["ta_pref"]))

    # TA preference for course
    course_rank = ta["course_pref"].index(prof["course"]) if prof["course"] in ta["course_pref"] else len(ta["course_pref"])
    course_score = rank_to_score(course_rank, len(ta["course_pref"]))

    # Workload balancing
    workload_diff = abs(current_workload - avg_workload)
    max_hours = max(ta["max_hours"], 1)
    workload_score = 1 - (workload_diff / max_hours)
    workload_score = max(0, workload_score)

    # Weighted total
    total_score = (
        weights["ta_pref"] * ta_score +
        weights["prof_pref"] * prof_score +
        weights["course_pref"] * course_score +
        weights["workload_balance"] * workload_score
    )

    return total_score


# Step 3: Main algorithm function
def run_assignment_algorithm():
    """Runs the TA assignment algorithm and returns results as a dict."""
    assignments = {prof: [] for prof in Professors}
    ta_workload = {ta: 0 for ta in TAs}
    total_slots = sum([Professors[p]["num_TAs"] for p in Professors])
    avg_workload = total_slots / len(TAs)

    # List all possible assignments
    possible_assignments = list(product(TAs.keys(), Professors.keys()))

    # Compute all pair scores
    scores = []
    for ta, prof in possible_assignments:
        score = compute_weighted_score(ta, prof, ta_workload[ta], avg_workload)
        scores.append((score, ta, prof))

    # Sort by score descending
    scores.sort(reverse=True, key=lambda x: x[0])

    # Assign greedily
    for score, ta, prof in scores:
        if len(assignments[prof]) < Professors[prof]["num_TAs"] and ta_workload[ta] < TAs[ta]["max_hours"]:
            assignments[prof].append(ta)
            ta_workload[ta] += 1

    # Return structured result
    return {
        "assignments": assignments,
        "workloads": ta_workload
    }
