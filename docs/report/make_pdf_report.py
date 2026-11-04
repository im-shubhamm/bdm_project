#!/usr/bin/env python3
"""Generate Handover/BDM_Project_Report.pdf in the style of the reference BDM report."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Image, KeepTogether, ListFlowable, ListItem, HRFlowable,
)

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(__file__).resolve().parent / "assets"
OUT = ROOT / "Handover" / "BDM_Project_Report.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

INK = HexColor("#1c1915")
MUTED = HexColor("#5c564c")
LINE = HexColor("#cfc5b4")
HEAD_BG = HexColor("#E7E3D8")
ACCENT = HexColor("#0f6b4c")


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Title"], fontName="Times-Bold", fontSize=18,
            leading=24, alignment=TA_CENTER, textColor=INK, spaceAfter=10,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", parent=base["Normal"], fontName="Times-Italic", fontSize=12,
            leading=16, alignment=TA_CENTER, textColor=MUTED, spaceAfter=18,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta", parent=base["Normal"], fontName="Times-Roman", fontSize=12,
            leading=16, alignment=TA_CENTER, textColor=INK, spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName="Times-Bold", fontSize=14,
            leading=18, textColor=INK, spaceBefore=14, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Times-Bold", fontSize=12,
            leading=15, textColor=INK, spaceBefore=10, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Times-Roman", fontSize=11,
            leading=15.5, alignment=TA_JUSTIFY, textColor=INK, spaceAfter=8,
        ),
        "caption": ParagraphStyle(
            "caption", parent=base["Normal"], fontName="Times-Italic", fontSize=9.5,
            leading=12, alignment=TA_CENTER, textColor=MUTED, spaceBefore=4, spaceAfter=10,
        ),
        "table_title": ParagraphStyle(
            "table_title", parent=base["Normal"], fontName="Times-Bold", fontSize=9.5,
            leading=12, alignment=TA_CENTER, textColor=INK, spaceBefore=6, spaceAfter=4,
        ),
        "toc": ParagraphStyle(
            "toc", parent=base["Normal"], fontName="Times-Roman", fontSize=11,
            leading=16, textColor=INK, spaceAfter=2,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontName="Times-Roman", fontSize=8,
            textColor=MUTED, alignment=TA_CENTER,
        ),
        "code": ParagraphStyle(
            "code", parent=base["Normal"], fontName="Courier", fontSize=9.5,
            leading=13, textColor=INK, backColor=HexColor("#F4F2EC"),
            leftIndent=6, rightIndent=6, spaceBefore=4, spaceAfter=8,
        ),
        "abstract_h": ParagraphStyle(
            "abstract_h", parent=base["Normal"], fontName="Times-Bold", fontSize=12,
            alignment=TA_CENTER, spaceAfter=8,
        ),
    }
    return s


def header_footer(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    if page > 1:
        canvas.setFont("Times-Roman", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(2 * cm, A4[1] - 1.2 * cm, "Superstore Sales & Profitability Intelligence · BDM Project Report")
        canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, str(page - 1))  # roman/body offset handled simply
        canvas.setStrokeColor(LINE)
        canvas.line(2 * cm, A4[1] - 1.35 * cm, A4[0] - 2 * cm, A4[1] - 1.35 * cm)
    canvas.restoreState()


def tbl(title, headers, rows, col_widths, s):
    data = [headers] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), HEAD_BG),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether([Paragraph(title, s["table_title"]), t, Spacer(1, 8)])


def fig(path, caption, s, width=6.3 * inch):
    img = Image(str(path), width=width, height=width * 0.52)
    # preserve aspect for taller charts
    from PIL import Image as PILImage
    with PILImage.open(path) as im:
        w, h = im.size
    height = width * (h / w)
    img = Image(str(path), width=width, height=height)
    return KeepTogether([img, Paragraph(caption, s["caption"])])


def build():
    s = styles()
    story = []

    # -------- COVER --------
    story.append(Spacer(1, 1.6 * inch))
    story.append(Paragraph(
        "SUPERSTORE SALES AND<br/>PROFITABILITY INTELLIGENCE",
        s["cover_title"],
    ))
    story.append(Paragraph(
        "Finding where a multi-category retailer makes money — and where discounts and product mix destroy it (2016–2019)",
        s["cover_sub"],
    ))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("A Project Report", s["cover_meta"]))
    story.append(Paragraph("submitted for the course", s["cover_meta"]))
    story.append(Paragraph("<b>BDM (Semester VII)</b>", s["cover_meta"]))
    story.append(Spacer(1, 0.45 * inch))
    story.append(Paragraph("Submitted by", s["cover_meta"]))
    story.append(Paragraph("Shubham (2023IMG048)", s["cover_meta"]))
    story.append(Paragraph("Arkadip Siddha (2023IMG009)", s["cover_meta"]))
    story.append(Paragraph("Advitya Ranjan (2023IMG004)", s["cover_meta"]))
    story.append(Paragraph("Chayan Das (2023IMG017)", s["cover_meta"]))
    story.append(Spacer(1, 1.1 * inch))
    story.append(Paragraph(
        "<b>ABV-INDIAN INSTITUTE OF INFORMATION TECHNOLOGY<br/>AND MANAGEMENT GWALIOR</b>",
        s["cover_meta"],
    ))
    story.append(Paragraph("GWALIOR, INDIA", s["cover_meta"]))
    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph("NOVEMBER, 2026", s["cover_meta"]))
    story.append(PageBreak())

    # -------- ABSTRACT + TOC --------
    story.append(Paragraph("Abstract", s["abstract_h"]))
    story.append(Paragraph(
        "Retailers often celebrate rising sales while profit quietly leaks through deep discounts and "
        "weak product lines. This project asks where Sample Superstore earned money and where it lost it. "
        "We downloaded a public Sample Superstore dataset from the internet (9,994 order lines, 5,009 orders, "
        "793 customers, 2016–2019), cleaned it into a star schema, loaded it into MongoDB, and analysed it in "
        "Power BI and a companion web dashboard. Total sales are about $2.30 million with profit of about "
        "$286 thousand (margin 12.5%). Furniture posts solid sales but only a 2.5% margin; Tables and Bookcases "
        "are loss-making. Lines sold with no discount return a 29.5% margin, while discounts above 40% lose "
        "money on average. The recommended actions are to cap deep discounts on weak furniture subcategories, "
        "protect high-margin Technology lines, and target At-Risk high-value customers identified by RFM.",
        s["body"],
    ))
    story.append(Paragraph(
        "<b>Keywords:</b> retail analytics, profitability, Power BI, MongoDB, discount analysis, RFM, star schema",
        s["body"],
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Table of Contents</b>", s["h1"]))
    toc_items = [
        "1. Introduction ................................................................................................ 1",
        "2. Data and Methodology ................................................................................ 1",
        "  2.1 Data Sources ......................................................................................... 1",
        "  2.2 Data Preparation ................................................................................... 2",
        "  2.3 Data Model ............................................................................................ 2",
        "  2.4 Profitability Metrics .............................................................................. 2",
        "3. Power BI Dashboard .................................................................................... 3",
        "4. Results and Analysis ................................................................................... 4",
        "  4.1 Sales Growth ......................................................................................... 4",
        "  4.2 Category and Subcategory Profit ............................................................ 4",
        "  4.3 Discount Impact .................................................................................... 5",
        "  4.4 Regions and Segments ........................................................................... 5",
        "  4.5 Customer RFM ...................................................................................... 6",
        "  4.6 Validation ............................................................................................... 6",
        "5. Web Application and MongoDB ..................................................................... 6",
        "6. Recommendations and Conclusion ............................................................... 7",
        "References ....................................................................................................... 8",
    ]
    for t in toc_items:
        story.append(Paragraph(t.replace(" ", "&nbsp;").replace(" ", "&nbsp;"), s["toc"]))
    story.append(PageBreak())

    # -------- 1 --------
    story.append(Paragraph("1. Introduction", s["h1"]))
    story.append(Paragraph(
        "A multi-category retailer sells Furniture (housewares), Office Supplies and Technology across "
        "four US regions. Managers see sales rise year after year, but not every dollar of revenue becomes "
        "profit. Between 2016 and 2019 the Sample Superstore dataset records $2,297,201 in sales and "
        "$286,397 in profit across 5,009 orders.",
        s["body"],
    ))
    story.append(Paragraph(
        "<b>Problem statement.</b> Which products, discounts, regions and customers earn their keep — "
        "and which destroy margin? Taking the view of a retail analytics team, we measure sales, profit, "
        "margin and discount damage so that assortment and promotion decisions can be made on evidence.",
        s["body"],
    ))
    story.append(Paragraph("The project answers six business questions:", s["body"]))
    qs = [
        "Which category and subcategory create the most (and least) profit?",
        "How do discounts affect profitability?",
        "Which regions and customer segments contribute most to sales and margin?",
        "Who are the Champions and At-Risk customers (RFM)?",
        "Has sales growth improved or diluted margin over 2016–2019?",
        "What concrete pricing and assortment actions follow from the data?",
    ]
    for i, q in enumerate(qs, 1):
        story.append(Paragraph(f"{i}. {q}", s["body"]))
    story.append(Paragraph(
        "The results are delivered in two front ends on one dataset: a Power BI model built from the "
        "cleaned CSVs in <font face='Courier'>powerbi/data/</font>, and a MERN-style web application that "
        "stores the same tables in MongoDB.",
        s["body"],
    ))

    # -------- 2 --------
    story.append(Paragraph("2. Data and Methodology", s["h1"]))
    story.append(Paragraph("2.1 Data Sources", s["h2"]))
    story.append(Paragraph(
        "Unlike a synthetic demo, this project uses a public retail dataset widely used for Tableau and "
        "Power BI teaching, downloaded from the internet.",
        s["body"],
    ))
    story.append(tbl(
        "Table 2.1: Data sources",
        ["Source", "What it provides", "Size"],
        [
            ["Sample Superstore CSV\n(GitHub mirror of Tableau sample)",
             "Order, ship, customer, geo, product, sales, qty, discount, profit",
             "9,994 lines"],
            ["URL", "https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv", "—"],
            ["Local raw file", "data/raw/Sample_Superstore.csv", "2016–2019"],
        ],
        [180, 230, 90],
        s,
    ))

    story.append(Paragraph("2.2 Data Preparation", s["h2"]))
    story.append(Paragraph(
        "Cleaning and modelling are done in a reproducible Python ETL script "
        "(<font face='Courier'>scripts/etl/build_superstore.py</font>) so the Power BI files and MongoDB "
        "seed stay identical. The main steps were:",
        s["body"],
    ))
    for b in [
        "Parsing order and ship dates (day-first format) and deriving ship days, year-month and discount bands.",
        "Normalising column names and building surrogate line IDs for the fact table.",
        "Building customer RFM scores (Recency, Frequency, Monetary quintiles) and segment labels: Champions, Promising, At Risk, Can’t Lose, Others.",
        "Exporting star-schema tables as JSON for MongoDB and CSV for Power BI Desktop.",
    ]:
        story.append(Paragraph(f"• {b}", s["body"]))

    story.append(Paragraph("2.3 Data Model", s["h2"]))
    story.append(Paragraph(
        "The model is a star schema with one fact table (order line) and four dimensions "
        "(customer, product, location, calendar). Aggregates by year, category, subcategory, "
        "region, segment and discount band support dashboard pages. DAX measures for Power BI "
        "are documented in <font face='Courier'>powerbi/measures/DAX.md</font>.",
        s["body"],
    ))
    story.append(fig(ASSETS / "fig_star.png", "Figure 2.1: Star schema of the analytics model", s))

    story.append(Paragraph("2.4 Profitability Metrics", s["h2"]))
    story.append(Paragraph(
        "The core metrics are additive sales and profit, with margin as their ratio:",
        s["body"],
    ))
    story.append(Paragraph("Profit Margin % = Total Profit ÷ Total Sales", s["code"]))
    story.append(Paragraph(
        "Discount bands group lines into No discount, Low (≤20%), Medium (21–40%) and High (&gt;40%). "
        "A line is marked loss-making when Profit &lt; 0. RFM segments summarise customer value for "
        "retention actions. All money figures are in US dollars as published in the source file.",
        s["body"],
    ))

    # -------- 3 --------
    story.append(Paragraph("3. Power BI Dashboard", s["h1"]))
    story.append(Paragraph(
        "Each page title states a finding, and a short “So what” note states the decision it supports. "
        "Green marks healthy profit; red marks losses. Table 3.1 lists the intended Power BI pages "
        "(also mirrored in the web app).",
        s["body"],
    ))
    story.append(tbl(
        "Table 3.1: Pages of the Power BI / web report",
        ["Page", "Question answered", "Main visuals"],
        [
            ["Overview", "How large is the business and margin?", "KPI strip, year trend"],
            ["Categories", "Where does profit come from?", "Sales vs profit bars, subcategory ranking"],
            ["Discounts", "Do promotions earn their keep?", "Profit by discount band, worst products"],
            ["Regions", "Which markets pull weight?", "Region bars, segment table"],
            ["Customers", "Who to keep / win back?", "RFM segments, top customers"],
            ["Methodology", "How was value measured?", "Sources, schema, team"],
        ],
        [100, 180, 220],
        s,
    ))
    story.append(Paragraph(
        "To open the Power BI half on a Windows laptop: import every CSV under "
        "<font face='Courier'>powerbi/data/</font>, relate FactSales to DimCustomer / DimProduct / "
        "DimCalendar, paste the DAX measures, and build the pages in Table 3.1 "
        "(see <font face='Courier'>powerbi/README.md</font>).",
        s["body"],
    ))
    story.append(fig(ASSETS / "fig_architecture.png", "Figure 3.1: Architecture — one dataset, two front ends", s))

    # -------- 4 --------
    story.append(Paragraph("4. Results and Analysis", s["h1"]))
    story.append(Paragraph("4.1 Sales Growth", s["h2"]))
    story.append(Paragraph(
        "Sales grew from $484k in 2016 to $733k in 2019. Profit also rose (from $50k to $93k), "
        "and margin stayed in a narrow band around 10–13%. Growth did not collapse profitability overall, "
        "but composition matters: some subcategories and discount bands still lose money inside that growth.",
        s["body"],
    ))
    story.append(fig(ASSETS / "fig_years.png", "Figure 4.1: Sales and profit by year", s))
    story.append(tbl(
        "Table 4.1: Yearly sales and profit",
        ["Year", "Sales", "Profit", "Orders", "Margin"],
        [
            ["2016", "$484,247", "$49,544", "969", "10.2%"],
            ["2017", "$470,533", "$61,619", "1,038", "13.1%"],
            ["2018", "$609,206", "$81,795", "1,315", "13.4%"],
            ["2019", "$733,215", "$93,439", "1,687", "12.7%"],
        ],
        [70, 110, 110, 80, 80],
        s,
    ))

    story.append(Paragraph("4.2 Category and Subcategory Profit", s["h2"]))
    story.append(Paragraph(
        "Technology leads profit ($145k, 17.4% margin). Office Supplies contribute strong profit ($122k, 17.0% margin) "
        "despite similar sales to Furniture. Furniture records $742k sales but only $18.5k profit (2.5% margin). "
        "The damage is concentrated: Tables lose about $17.7k and Bookcases about $3.5k.",
        s["body"],
    ))
    story.append(fig(ASSETS / "fig_category.png", "Figure 4.2: Sales vs profit by category", s))
    story.append(fig(ASSETS / "fig_subcategory.png", "Figure 4.3: Profit by subcategory (red = loss)", s, width=6.3 * inch))
    story.append(tbl(
        "Table 4.2: Category performance",
        ["Category", "Sales", "Profit", "Margin"],
        [
            ["Technology", "$836,154", "$145,455", "17.4%"],
            ["Office Supplies", "$719,047", "$122,491", "17.0%"],
            ["Furniture", "$742,000", "$18,451", "2.5%"],
        ],
        [130, 120, 120, 80],
        s,
    ))

    story.append(Paragraph("4.3 Discount Impact", s["h2"]))
    story.append(Paragraph(
        "Discounting is the clearest profit leak. Lines with no discount deliver $321k profit at a 29.5% margin. "
        "Low discounts (≤20%) remain profitable. Medium and especially high (&gt;40%) discount bands are "
        "loss-making on average (−$36k and −$100k profit respectively). About 1,871 lines (18.7%) are loss-making.",
        s["body"],
    ))
    story.append(fig(ASSETS / "fig_discount.png", "Figure 4.4: Profit by discount band", s))
    story.append(tbl(
        "Table 4.3: Profitability by discount band",
        ["Discount band", "Lines", "Sales", "Profit", "Margin"],
        [
            ["No discount", "4,798", "$1,087,908", "$320,988", "29.5%"],
            ["Low (≤20%)", "3,803", "$846,522", "$100,785", "11.9%"],
            ["Medium (21–40%)", "460", "$234,138", "−$35,817", "−15.3%"],
            ["High (&gt;40%)", "933", "$128,632", "−$99,559", "−77.4%"],
        ],
        [130, 70, 110, 100, 70],
        s,
    ))

    story.append(Paragraph("4.4 Regions and Segments", s["h2"]))
    story.append(Paragraph(
        "West leads sales ($725k) and profit ($108k) with a 14.9% margin. Central posts the weakest margin (7.9%) "
        "despite material sales. By segment, Consumer is largest on sales; Home Office shows the highest margin "
        "(14.0%), followed by Corporate (13.0%) and Consumer (11.5%).",
        s["body"],
    ))
    story.append(fig(ASSETS / "fig_region.png", "Figure 4.5: Sales and profit by region", s))

    story.append(Paragraph("4.5 Customer RFM", s["h2"]))
    story.append(Paragraph(
        "RFM scoring labels 92 Champions and 150 At Risk customers, with 96 in the Can’t Lose group "
        "(high monetary value but weak recency). Champions and Can’t Lose customers should be prioritised "
        "for retention; At Risk customers need win-back offers that do not rely on destructive deep discounts.",
        s["body"],
    ))
    story.append(tbl(
        "Table 4.4: RFM segment counts (from DimCustomer)",
        ["RFM segment", "Customers"],
        [
            ["Others", "230"],
            ["Promising", "225"],
            ["At Risk", "150"],
            ["Can’t Lose", "96"],
            ["Champions", "92"],
        ],
        [200, 120],
        s,
    ))

    story.append(Paragraph("4.6 Validation", s["h2"]))
    story.append(Paragraph(
        "Row counts match the downloaded CSV (9,994 lines). Sales and profit totals reconcile to "
        "$2,297,200.86 and $286,397.02. Category and discount aggregates were recomputed independently "
        "in pandas during ETL. The web API and Power BI CSVs are generated from the same processed tables, "
        "so both front ends show identical KPIs.",
        s["body"],
    ))

    # -------- 5 --------
    story.append(Paragraph("5. Web Application and MongoDB", s["h1"]))
    story.append(Paragraph(
        "The web app shows the same pages and numbers as the dashboard plan, so anyone can open it in a "
        "browser without Power BI. Cleaned tables were exported to JSON and loaded into MongoDB "
        "(in-memory for local demo, or Atlas in deployment). An Express API serves aggregates; React draws "
        "the charts. Collections include fact_sales, dim_customers, dim_products, and the agg_* summaries "
        "(about 11k documents including the full fact table).",
        s["body"],
    ))
    story.append(Paragraph(
        "Repository: <font face='Courier'>https://github.com/im-shubhamm/bdm_project</font>",
        s["body"],
    ))

    # -------- 6 --------
    story.append(Paragraph("6. Recommendations and Conclusion", s["h1"]))
    story.append(Paragraph("6.1 Recommendations", s["h2"]))
    for i, r in enumerate([
        "Cap discounts above 20% on Furniture Tables and Bookcases unless the basket attaches high-margin Technology add-ons.",
        "Protect Copiers, Phones and Accessories — they fund the profit pool.",
        "Investigate Central region margin gaps with a Region × SubCategory matrix in Power BI.",
        "Run retention plays on Champions and Can’t Lose customers; avoid win-backs that require &gt;40% discounts.",
        "Use margin and loss-line % as operating KPIs alongside sales.",
    ], 1):
        story.append(Paragraph(f"{i}. {r}", s["body"]))

    story.append(Paragraph("6.2 Limitations", s["h2"]))
    for b in [
        "The Sample Superstore file is a teaching dataset, not a live POS feed; currency and store IDs are as published.",
        "RFM uses only the 2016–2019 window; there is no post-2019 behaviour.",
        "Cost components behind list price are not available — profit is as given in the source.",
    ]:
        story.append(Paragraph(f"• {b}", s["body"]))

    story.append(Paragraph("6.3 Conclusion", s["h2"]))
    story.append(Paragraph(
        "By loading a real Superstore dataset from the internet into a star schema, MongoDB and Power BI, "
        "we showed that sales growth can hide product and discount losses. Furniture looks large on revenue "
        "but weak on margin; deep discounts destroy profit; Technology carries the business. The Power BI "
        "pack and MongoDB-backed web app turn these findings into a practical tool for assortment and "
        "promotion decisions in the BDM viva.",
        s["body"],
    ))

    story.append(Paragraph("References", s["h1"]))
    refs = [
        "[1] Sample Superstore dataset (Tableau / Power BI teaching sample), GitHub mirror: "
        "https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv",
        "[2] Kimball, R. and Ross, M. (2013). The Data Warehouse Toolkit (3rd ed.). Wiley.",
        "[3] Microsoft (2026). Power BI, DAX and Power Query documentation. https://learn.microsoft.com/power-bi/",
        "[4] MongoDB, Inc. (2026). MongoDB documentation. https://www.mongodb.com/docs/",
        "[5] Express, React and Vite documentation (2026). https://expressjs.com/ · https://react.dev/ · https://vitejs.dev/",
        "[6] Fader, P., Hardie, B. and Lee, K. (2005). RFM and CLV: Using iso-value curves. Journal of Marketing Research.",
    ]
    for r in refs:
        story.append(Paragraph(r, s["body"]))
    story.append(Paragraph(
        "Project repository: https://github.com/im-shubhamm/bdm_project",
        s["body"],
    ))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "<b>Team:</b> Shubham (2023IMG048), Arkadip Siddha (2023IMG009), "
        "Advitya Ranjan (2023IMG004), Chayan Das (2023IMG017)",
        s["body"],
    ))

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Superstore Sales & Profitability Intelligence — BDM Project Report",
        author="Shubham, Arkadip Siddha, Advitya Ranjan, Chayan Das",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
