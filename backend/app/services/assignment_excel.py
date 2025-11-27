import pandas as pd
import numpy as np
from itertools import product
import math
import re
import logging
from typing import Dict, Tuple, Any

# --- Configuration ---
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TA_SHEET_NAME = "COMP TA List"
PROF_SHEET_NAME = "TA Needs Planning"

# COLUMN NAMES BASED ON EXCEL SHEET
COLUMN_NAMES = {
    "ta_list_name": "NAME",
    "prof_list_faculty": "Faculty",
    "prof_list_course": "Course",
    "prof_list_ta_needs": "\n\nNumber of TAs requested for Spring 2025",
    "prof_list_ta_prefs": "Preferred TAs (or requirements) \n"
}

# --- Data Loading Function (Excel Version) ---

def load_data_from_files(excel_file_path: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Loads TA and Professor data from the specified sheets in a single Excel file.
    """
    TAs: Dict[str, Any] = {}
    Professors: Dict[str, Any] = {}

    # --- Step 1: Load TAs from the 'COMP TA List' sheet ---
    try:
        ta_df = pd.read_excel(excel_file_path, sheet_name=TA_SHEET_NAME)

        if COLUMN_NAMES["ta_list_name"] not in ta_df.columns:
            logger.error(f"Column '{COLUMN_NAMES['ta_list_name']}' not found in sheet '{TA_SHEET_NAME}'")
            logger.error(f"Available columns are: {list(ta_df.columns)}")
            return {}, {}

        for name in ta_df[COLUMN_NAMES["ta_list_name"]].dropna():
            ta_name = name.strip()
            if ta_name not in TAs:
                TAs[ta_name] = {
                    "prof_pref": [],
                    "course_pref": [],
                    "max_hours": 10  # Placeholder
                }
        logger.info(f"Loaded {len(TAs)} TAs from sheet '{TA_SHEET_NAME}'")

    except FileNotFoundError:
        logger.error(f"ERROR: Excel file not found at {excel_file_path}")
        return {}, {}
    except ValueError as e:
        logger.error(f"ERROR: Sheet '{TA_SHEET_NAME}' not found. {e}")
        return {}, {}
    except Exception as e:
        logger.error(f"ERROR reading {excel_file_path} (Sheet: {TA_SHEET_NAME}): {e}")
        return {}, {}

    # --- Step 2: Load Professors from the 'TA Needs Planning' sheet ---
    try:
        prof_df = pd.read_excel(excel_file_path, sheet_name=PROF_SHEET_NAME)
        prof_df.columns = prof_df.columns.str.strip()

        col_faculty = COLUMN_NAMES["prof_list_faculty"].strip()
        col_course = COLUMN_NAMES["prof_list_course"].strip()
        col_ta_needs = COLUMN_NAMES["prof_list_ta_needs"].strip()
        col_ta_prefs = COLUMN_NAMES["prof_list_ta_prefs"].strip()

        required_cols = [col_faculty, col_course, col_ta_needs, col_ta_prefs]
        if not all(col in prof_df.columns for col in required_cols):
            logger.error(f"ERROR: Missing one or more required columns in sheet '{PROF_SHEET_NAME}'")
            logger.error(f"Expected: {required_cols}")
            logger.error(f"Found columns: {list(prof_df.columns)}")
            return {}, {}

        for _, row in prof_df.iterrows():
            faculty_str = str(row[col_faculty])
            if pd.isna(faculty_str):
                continue
            
            prof_names = [name.strip() for name in faculty_str.split(',')]
            course = row[col_course]
            if pd.isna(course):
                course = "Unknown"

            ta_needs_val = pd.to_numeric(row[col_ta_needs], errors='coerce')
            num_tas_total = int(ta_needs_val) if pd.notna(ta_needs_val) and ta_needs_val > 0 else len(prof_names)
            num_tas_per_prof = max(1, int(math.ceil(num_tas_total / len(prof_names))))

            ta_pref_list = []
            pref_str = str(row[col_ta_prefs])
            
            if pd.notna(pref_str) and "must be" not in pref_str.lower():
                potential_names = re.split(r'[,+]', pref_str)
                for name in potential_names:
                    cleaned_name = name.strip()
                    if cleaned_name and not cleaned_name.isdigit():
                        ta_pref_list.append(cleaned_name)
                        if cleaned_name not in TAs:
                            TAs[cleaned_name] = {
                                "prof_pref": [],
                                "course_pref": [],
                                "max_hours": 10
                            }

            for prof_name in prof_names:
                if prof_name not in Professors:
                    Professors[prof_name] = {
                        "ta_pref": ta_pref_list,
                        "num_TAs": num_tas_per_prof,
                        "course": course.strip()
                    }
        
        logger.info(f"Loaded {len(Professors)} Professors from sheet '{PROF_SHEET_NAME}'")

    except ValueError as e:
        logger.error(f"ERROR: Sheet '{PROF_SHEET_NAME}' not found. {e}")
        return {}, {}
    except Exception as e:
        logger.error(f"ERROR reading {excel_file_path} (Sheet: {PROF_SHEET_NAME}): {e}")
        return {}, {}

    if not TAs or not Professors:
        logger.error("ERROR: Failed to load TAs or Professors. Aborting.")
        return {}, {}
        
    return TAs, Professors

# --- Algorithm Functions ---

# CRITERIA
weights = {
    "ta_pref": 0.4,
    "prof_pref": 0.3,
    "course_pref": 0.2,
    "workload_balance": 0.1
}

def rank_to_score(rank: int, max_rank: int) -> float:
    """Handles division by zero if preference list is empty."""
    if max_rank == 0:
        return 0.0
    return (max_rank - rank) / max_rank

def compute_weighted_score(ta_name: str, prof_name: str, current_workload: float, avg_workload: float, TAs: Dict, Professors: Dict) -> float:
    """
    Computes score, taking TAs and Professors dicts as arguments.
    """
    try:
        ta = TAs[ta_name]
        prof = Professors[prof_name]
    except KeyError as e:
        logger.warning(f"KeyError: Could not find {e} in dictionaries. Skipping.")
        return -1

    ta_pref_list = ta.get("prof_pref", [])
    ta_rank = ta_pref_list.index(prof_name) if prof_name in ta_pref_list else len(ta_pref_list)
    ta_score = rank_to_score(ta_rank, len(ta_pref_list))

    prof_pref_list = prof.get("ta_pref", [])
    prof_rank = prof_pref_list.index(ta_name) if ta_name in prof_pref_list else len(prof_pref_list)
    prof_score = rank_to_score(prof_rank, len(prof_pref_list))

    course_pref_list = ta.get("course_pref", [])
    prof_course = prof.get("course")
    course_rank = course_pref_list.index(prof_course) if prof_course in course_pref_list else len(course_pref_list)
    course_score = rank_to_score(course_rank, len(course_pref_list))

    workload_diff = abs(current_workload - avg_workload)
    max_hours = max(ta.get("max_hours", 1), 1)
    workload_score = 1 - (workload_diff / max_hours)
    workload_score = max(0, workload_score)

    total_score = (
        weights["ta_pref"] * ta_score +
        weights["prof_pref"] * prof_score +
        weights["course_pref"] * course_score +
        weights["workload_balance"] * workload_score
    )
    return total_score

def run_assignment_algorithm(TAs: Dict, Professors: Dict) -> Dict[str, Any]:
    """
    Runs the TA assignment algorithm and returns results as a dict.
    """
    if not TAs or not Professors:
        logger.error("Cannot run algorithm with empty TA or Professor list.")
        return {"assignments": {}, "workloads": {}}

    assignments: Dict[str, list] = {prof: [] for prof in Professors}
    ta_workload: Dict[str, int] = {ta: 0 for ta in TAs}
    
    try:
        total_slots = sum([Professors[p].get("num_TAs", 0) for p in Professors])
        avg_workload = total_slots / len(TAs) if len(TAs) > 0 else 0
    except Exception as e:
        logger.error(f"Error calculating total slots: {e}")
        return {"assignments": {}, "workloads": {}}

    possible_assignments = list(product(TAs.keys(), Professors.keys()))

    scores = []
    for ta, prof in possible_assignments:
        score = compute_weighted_score(ta, prof, ta_workload[ta], avg_workload, TAs, Professors)
        if score >= 0:
            scores.append((score, ta, prof))

    scores.sort(reverse=True, key=lambda x: x[0])

    for score, ta, prof in scores:
        prof_needs = Professors[prof].get("num_TAs", 0)
        ta_max_hours = TAs[ta].get("max_hours", 0)
        
        if len(assignments[prof]) < prof_needs and ta_workload[ta] < ta_max_hours:
            assignments[prof].append(ta)
            ta_workload[ta] += 1

    return {
        "assignments": assignments,
        "workloads": ta_workload
    }

# --- MAIN SERVICE FUNCTION ---

def generate_ta_assignments(excel_file_path: str) -> Dict[str, Any]:
    """
    Main entry point function. Loads data from the file and runs the algorithm.
    """
    logger.info(f"--- Loading Data from {excel_file_path} ---")
    TAs, Professors = load_data_from_files(excel_file_path)
    
    if not TAs or not Professors:
        logger.error("Data loading failed. Aborting assignment.")
        return {"error": "Failed to load TAs or Professors. Check file content and sheet names."}

    logger.info("--- Running Assignment Algorithm ---")
    results = run_assignment_algorithm(TAs, Professors)
    
    logger.info("--- Assignment Completed ---")
    return results