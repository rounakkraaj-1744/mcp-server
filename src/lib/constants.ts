import { Role, UserSession } from "./types";

export const PROFILE_TO_ROLE: Record<number, Role> = {
    8: "PIC",
    9: "OPM",
    10: "SM",
    11: "AM",
    12: "CMM",
    13: "MM",
    14: "TM",
    15: "DC",
    16: "SLA",
};

export const ROLE_ALLOWED_TABLES: Record<string, string[]> = {
    PIC: [
        "pilot_mission",
        "pilot_mission_result",
        "planning",
        "planning_logbook",
        "pilot_declaration",
        "notification",
        "repository_file",
    ],
    OPM: [
        "pilot_mission",
        "planning",
        "planning_logbook",
        "pilot_mission_result",
        "calendar_shift",
        "checklist",
        "luc_document",
        "users",
    ],
    SM: [
        "safety_report",
        "safety_action",
        "spi_kpi",
        "spi_kpi_definition",
        "spi_kpi_log",
        "alert_log",
        "pilot_mission",
    ],
    AM: [
        "pilot_mission",
        "planning",
        "tool",
        "tool_maintenance",
        "luc_document",
        "audit",
        "compliance_requirement",
    ],
    CMM: [
        "audit",
        "audit_finding",
        "compliance_requirement",
        "compliance_evidence",
        "compliance_status_log",
        "spi_kpi",
        "spi_kpi_definition",
    ],
    MM: [
        "tool",
        "tool_maintenance",
        "tool_component",
        "maintenance_ticket",
        "maintenance_ticket_event",
        "maintenance_ticket_item",
    ],
    TM: [
        "training",
        "training_attendance",
        "spi_kpi",
        "users",
        "users_profile",
    ],
    DC: [
        "users",
        "users_profile",
        "user_permessi",
        "pilot_mission",
        "planning_logbook",
        "repository_file",
    ],
    SLA: [
        "pilot_mission",
        "tool",
        "maintenance_ticket",
        "spi_kpi",
        "alert_log",
        "client",
    ],
};

export const BLOCKED_COLUMNS: string[] = [
    "password_hash",
    "auth_user_id",
    "_key_",
    "api_key",
    "session_token",
    "purchase_price",
    "actual_cost",
    "estimated_cost",
];

export const DUMMY_USERS_MAP: Record<string, UserSession> = {
    "prajwalmadikai@gmail.com": { userId: 91, role: "PIC", ownerID: 5, name: "Prajwal P", email: "prajwalmadikai@gmail.com" },
    "opm@readi.com": { userId: 93, role: "OPM", ownerID: 5, name: "Operation Manager", email: "opm@readi.com" },
    "sm@readi.com": { userId: 95, role: "SM", ownerID: 5, name: "Safety Manager", email: "sm@readi.com" },
    "am@readi.com": { userId: 97, role: "AM", ownerID: 5, name: "Account Manager", email: "am@readi.com" },
    "cmm@readi.com": { userId: 99, role: "CMM", ownerID: 5, name: "Rahul", email: "cmm@readi.com" },
    "rm@readi.com": { userId: 101, role: "MM", ownerID: 5, name: "Sanjay", email: "rm@readi.com" },
    "tm@readi.com": { userId: 103, role: "TM", ownerID: 5, name: "Manu", email: "tm@readi.com" },
    "dc@readi.com": { userId: 105, role: "DC", ownerID: 5, name: "Rohith", email: "dc@readi.com" },
    "sla@readi.com": { userId: 107, role: "SLA", ownerID: 5, name: "Ann", email: "sla@readi.com" },
    "pic@readi.com": { userId: 109, role: "PIC", ownerID: 5, name: "James", email: "pic@readi.com" },
};


export const DUMMY_USERS_LIST = Object.values(DUMMY_USERS_MAP);

export const ROLE_SUGGESTIONS: Record<string, string[]> = {
    PIC: [
        "How many missions have I completed?",
        "What is my total flight time?",
        "Show my cancelled missions",
        "What was my last mission?",
    ],
    OPM: [
        "How many missions are planned this month?",
        "Show all completed missions",
        "List active flight plans",
        "How many pilots are active?",
    ],
    SM: [
        "How many safety reports are open?",
        "Show critical severity reports",
        "What are my KPI values?",
        "List all active alerts",
    ],
    AM: [
        "Show tools needing calibration",
        "How many audits are completed?",
        "List active compliance requirements",
        "Show planned missions",
    ],
    CMM: [
        "How many audit findings are open?",
        "Show compliance requirements",
        "What KPIs are at risk?",
        "List recent audits",
    ],
    MM: [
        "How many maintenance tickets are open?",
        "Which tools need calibration?",
        "Show overdue maintenance",
        "List tool components",
    ],
    TM: [
        "How many training courses are active?",
        "Show training completion rates",
        "Who has certifications expiring?",
        "List all training sessions",
    ],
    DC: [
        "How many active users are there?",
        "Show user permissions",
        "List viewer-only users",
        "How many documents are uploaded?",
    ],
    SLA: [
        "Show open maintenance tickets",
        "How many missions completed this month?",
        "List active alerts",
        "What KPIs are breached?",
    ],
};

export const ROLE_COLORS: Record<string, string> = {
    PIC: "bg-blue-600",
    OPM: "bg-emerald-600",
    SM: "bg-amber-600",
    AM: "bg-purple-600",
    CMM: "bg-violet-600",
    MM: "bg-orange-600",
    TM: "bg-teal-600",
    DC: "bg-indigo-600",
    SLA: "bg-rose-600",
};
