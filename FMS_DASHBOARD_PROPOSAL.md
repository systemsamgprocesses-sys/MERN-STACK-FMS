# FMS Progress Dashboard Proposal

## 1. Objective

To provide a comprehensive, at-a-glance overview of the Facility Management System (FMS) progress, tailored for executive review by the Managing Director. The dashboard will offer high-level KPIs, visual breakdowns, and drill-down capabilities to track performance across departments, categories, and stages.

---

## 2. Proposed Dashboard Layout & Components

The dashboard will be organized into three main sections:

1.  **KPI Section:** Quick-glance statistics at the top.
2.  **Visualizations Section:** Charts for intuitive understanding of data.
3.  **Detailed Table Section:** Granular data with powerful filtering.

### Wireframe

```
+-------------------------------------------------------------------------------------------------+
| FMS Progress Dashboard                                                 [Date Range Filter]      |
+-------------------------------------------------------------------------------------------------+
|                        |                        |                          |                       |
| [Total Tasks]          | [Open Tasks]           | [In Progress Tasks]      | [Completed Tasks]     |
|         150            |         25             |            75            |         50            |
|                        |                        |                          |                       |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
| <-- FMS Progress by Department (Bar Chart) -->                                                  |
|                                                                                                 |
|                                                                                                 |
|                                                                                                 |
|                                                                                                 |
+-------------------------------------------------------------------------------------------------+
|                                      |                                                          |
| <-- Progress by Category (Pie Chart) |         <-- FMS Status Funnel (Funnel Chart) -->           |
|                                      |                                                          |
|                                      |                                                          |
|                                      |                                                          |
+-------------------------------------------------------------------------------------------------+
| Filters: [Department] [Category] [Status] [Clear Filters]                                       |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
| <-- Detailed FMS Task List (Table) -->                                                          |
| | ID | Title | Department | Category | Status | Assigned To | Due Date |                         |
|                                                                                                 |
+-------------------------------------------------------------------------------------------------+
```

---

## 3. Key Performance Indicators (KPIs)

This section will provide immediate insight into the overall FMS status.

*   **Total Tasks:** Total number of FMS tasks created within the selected date range.
*   **Open Tasks:** Tasks that have been created but not yet started.
*   **In Progress Tasks:** Tasks currently being worked on.
*   **Completed Tasks:** Tasks that have been successfully closed.
*   **Overdue Tasks:** (Optional but Recommended) Tasks that have passed their due date.

---

## 4. Visualizations

### a. FMS Progress by Department

*   **Chart Type:** Horizontal Bar Chart.
*   **Purpose:** To clearly show the volume of FMS tasks handled by each department. Each bar will be segmented by status (e.g., Open, In Progress, Completed) to visualize workload and efficiency.
*   **Example:**
    *   **IT Department:**      [||||| (Open) |||||||||| (In Progress) |||| (Completed)]
    *   **HR Department:**      [||| (Open) |||||||| (In Progress) |||||||||| (Completed)]
    *   **Operations:**         [|| (Open) ||||| (In Progress) ||||| (Completed)]

### b. FMS Progress by Category

*   **Chart Type:** Donut Chart or Pie Chart.
*   **Purpose:** To show the distribution of tasks across different FMS categories (e.g., Electrical, Plumbing, HVAC, IT Support). This helps identify which areas require the most resources.
*   **Example:** A pie chart where slices represent "Electrical (40%)", "Plumbing (25%)", "IT Support (20%)", etc.

### c. FMS Status Funnel/Pipeline (Steps-wise)

*   **Chart Type:** Funnel Chart.
*   **Purpose:** To visualize the flow of tasks through various stages, from creation to completion. This is excellent for identifying bottlenecks in the process.
*   **Stages could be:**
    1.  Task Created
    2.  Assigned
    3.  Work In Progress
    4.  Pending Review
    5.  Completed

---

## 5. Filtering & Interactivity

To ensure the MD can drill down into specifics, the following filters are essential:

*   **Primary Filter:**
    *   **Date Range:** Pre-set options (This Week, This Month, Last 3 Months) and a custom date range selector.
*   **Secondary Filters:**
    *   **Department:** Multi-select dropdown.
    *   **Category:** Multi-select dropdown.
    *   **Status/Step:** Multi-select dropdown (e.g., Open, In Progress, Completed).
*   **Interactivity:** Clicking on a segment of any chart (e.g., the "IT Department" bar) will automatically filter the entire dashboard to show data for that selection only.

---

## 6. Detailed Task Table

*   **Purpose:** Provides a granular view of the FMS tasks. This table will update dynamically based on the selected filters.
*   **Columns:**
    *   Task ID
    *   Title/Description
    *   Department
    *   Category
    *   Current Status
    *   Assigned To
    *   Created Date
    *   Due Date
    *   Priority
*   **Features:**
    *   **Sorting:** All columns should be sortable.
    *   **Export:** An "Export to CSV" button to download the filtered data for offline analysis.

Please review this proposal. We can make adjustments to the components, charts, or layout as needed before proceeding with implementation.
