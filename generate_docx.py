import os
import sys
import subprocess

# Ensure python-docx is installed
try:
    import docx
except ImportError:
    print("python-docx not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-docx"])
    import docx

from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Set the background color of a cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner padding/margins for table cells (in twips)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tc_mar.append(node)
    tc_pr.append(tc_mar)

def set_table_borders(table):
    """Set thin black borders for tables."""
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        f'  <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        f'  <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        f'  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        f'</w:tblBorders>'
    )
    tbl_pr.append(borders)

def add_page_number(run):
    """Insert a dynamic PAGE field element into the run."""
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
    r = run._r
    r.append(fldChar1)
    r.append(instrText)
    r.append(fldChar2)
    r.append(fldChar3)

def build_report():
    doc = Document()
    
    # Configure margins, paper size (A4), and orientation (Portrait)
    for section in doc.sections:
        # Paper size A4
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.orientation = WD_ORIENT.PORTRAIT
        
        # Margins: Left (spiral binding edge) = 3.75 cm, others = 2.5 cm
        section.left_margin = Cm(3.75)
        section.right_margin = Cm(2.5)
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        
        # Enable different first page for header/footer (cover page should not have footer page number)
        section.different_first_page_header_footer = True
        
        # Setup page number in footer (centered, font size 11, Times New Roman)
        footer = section.footer
        footer_p = footer.paragraphs[0]
        footer_p.text = "" # Clear default text
        footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer_p.paragraph_format.space_before = Pt(0)
        footer_p.paragraph_format.space_after = Pt(0)
        
        run_pn = footer_p.add_run()
        run_pn.font.name = 'Times New Roman'
        run_pn.font.size = Pt(11)
        add_page_number(run_pn)

    # Helper function for adding paragraphs (Size 12 Times New Roman, line spacing = 1.5)
    def add_para(text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=12, indent=0.5, bold=False, italic=False, font_size=12):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.5 # 1.5 Paragraph Spacing
        if indent > 0:
            p.paragraph_format.first_line_indent = Inches(indent)
        
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(font_size)
        run.bold = bold
        run.italic = italic
        return p

    # Helper function for Chapter Names (Size 16 Bold, centered)
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(24)
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.keep_with_next = True
        
        run = p.add_run(text.upper())
        run.font.name = 'Times New Roman'
        run.font.size = Pt(16)
        run.bold = True
        return p

    # Helper function for Topics of Chapter (Size 14 Bold, left-aligned)
    def add_heading_2(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.keep_with_next = True
        
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        run.bold = True
        return p

    # Helper function for Sub Topics (Size 12 Italic, Bold, left-aligned)
    def add_heading_3(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.keep_with_next = True
        
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        run.bold = True
        run.italic = True
        return p

    # ================= PAGE 1: TITLE PAGE =================
    p_header = doc.add_paragraph()
    p_header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_header.paragraph_format.space_after = Pt(24)
    r_hdr = p_header.add_run("INTERNSHIP REPORT")
    r_hdr.font.name = 'Times New Roman'
    r_hdr.font.size = Pt(16)
    r_hdr.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(24)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(24)
    r_title = p_title.add_run("SCADA DATA ANALYTICS & MACHINE LEARNING DASHBOARD")
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(20)
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(3, 105, 161) # Professional blue

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(36)
    r_sub = p_sub.add_run("Submitted in partial fulfillment of the requirements for the Summer Internship of\n")
    r_sub.font.name = 'Times New Roman'
    r_sub.font.size = Pt(12)
    r_sub.italic = True
    r_sub_b = p_sub.add_run("Bachelor of Technology (B.Tech.)")
    r_sub_b.font.name = 'Times New Roman'
    r_sub_b.font.size = Pt(12)
    r_sub_b.bold = True

    p_submit = doc.add_paragraph()
    p_submit.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_submit.paragraph_format.space_after = Pt(12)
    r_subby = p_submit.add_run("Submitted by:")
    r_subby.font.name = 'Times New Roman'
    r_subby.font.size = Pt(12)
    r_subby.italic = True

    add_para("K.Laxmi Priya (23A91A4429 – DS)", align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4, indent=0, bold=True)
    add_para("SK.Mahaboobinnisa (23A91A4459 – DS)", align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4, indent=0, bold=True)
    add_para("V.Likhitha (23A91A4465 — DS)", align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24, indent=0, bold=True)

    p_guide = doc.add_paragraph()
    p_guide.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_guide.paragraph_format.space_after = Pt(18)
    r_g1 = p_guide.add_run("Under the Guidance of\n")
    r_g1.font.name = 'Times New Roman'
    r_g1.font.size = Pt(12)
    r_g2 = p_guide.add_run("Mr. Patnala Pattabhirama Mohan\n")
    r_g2.font.name = 'Times New Roman'
    r_g2.font.size = Pt(12)
    r_g2.bold = True
    r_g3 = p_guide.add_run("Assistant Professor, Department of DS (Guide)")
    r_g3.font.name = 'Times New Roman'
    r_g3.font.size = Pt(11)

    p_dur = doc.add_paragraph()
    p_dur.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dur.paragraph_format.space_after = Pt(48)
    r_d1 = p_dur.add_run("Internship Duration:\n")
    r_d1.font.name = 'Times New Roman'
    r_d1.font.size = Pt(11)
    r_d2 = p_dur.add_run("From: 05/05/2026 - To: 29/06/2026")
    r_d2.font.name = 'Times New Roman'
    r_d2.font.size = Pt(11)
    r_d2.bold = True

    p_coll = doc.add_paragraph()
    p_coll.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c1 = p_coll.add_run("DEPARTMENT OF INFORMATION TECHNOLOGY\nADITYA UNIVERSITY\n")
    r_c1.font.name = 'Times New Roman'
    r_c1.font.size = Pt(13)
    r_c1.bold = True
    r_c2 = p_coll.add_run("Aditya Nagar, ADB Road, Surampalem, Andhra Pradesh, India\n2026")
    r_c2.font.name = 'Times New Roman'
    r_c2.font.size = Pt(12)
    r_c2.bold = True

    # ================= PAGE 2: CERTIFICATE =================
    doc.add_page_break()
    
    p_uhead = doc.add_paragraph()
    p_uhead.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uh = p_uhead.add_run("ADITYA UNIVERSITY\n")
    r_uh.font.name = 'Times New Roman'
    r_uh.font.size = Pt(18)
    r_uh.bold = True
    r_uh.font.color.rgb = RGBColor(3, 105, 161)
    r_uhs = p_uhead.add_run("Aditya Nagar, ADB Road, Surampalem, Andhra Pradesh, India\n")
    r_uhs.font.name = 'Times New Roman'
    r_uhs.font.size = Pt(9)
    
    doc.add_paragraph("_________________________________________________________________________________").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph().paragraph_format.space_after = Pt(18)

    p_cert = doc.add_paragraph()
    p_cert.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cert.paragraph_format.space_after = Pt(24)
    r_cert = p_cert.add_run("CERTIFICATE")
    r_cert.font.name = 'Times New Roman'
    r_cert.font.size = Pt(16)
    r_cert.bold = True
    r_cert.underline = True

    add_para(
        "This is to certify that the project entitled \"SCADA DATA ANALYTICS & MACHINE LEARNING DASHBOARD\" "
        "is being submitted by K.Laxmi Priya (23A91A4429), SK.Mahaboobinnisa (23A91A4459), and V.Likhitha (23A91A4465) "
        "in partial fulfillment of the requirements for the Summer Internship in Information Technology (IT). "
        "The work carried out by the students is genuine and fulfills the requirements prescribed by the institution.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=36, indent=0.5
    )

    p_sig = doc.add_paragraph()
    p_sig.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_sig.paragraph_format.space_before = Pt(72)
    sig_text = (
        "Project Guide                                                                         Date: 25.June.2026\n"
        "_____________________                                                               Place: Surampalem\n"
        "Mr. Patnala Pattabhirama Mohan\n"
        "Assistant Professor, Department of DS"
    )
    r_sig = p_sig.add_run(sig_text)
    r_sig.font.name = 'Times New Roman'
    r_sig.font.size = Pt(12)
    r_sig.bold = True

    # ================= PAGE 3: DECLARATION =================
    doc.add_page_break()
    
    p_uhead2 = doc.add_paragraph()
    p_uhead2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uh2 = p_uhead2.add_run("ADITYA UNIVERSITY\n")
    r_uh2.font.name = 'Times New Roman'
    r_uh2.font.size = Pt(18)
    r_uh2.bold = True
    r_uh2.font.color.rgb = RGBColor(3, 105, 161)
    r_uhs2 = p_uhead2.add_run("Aditya Nagar, ADB Road, Surampalem, Andhra Pradesh, India\n")
    r_uhs2.font.name = 'Times New Roman'
    r_uhs2.font.size = Pt(9)
    
    doc.add_paragraph("_________________________________________________________________________________").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph().paragraph_format.space_after = Pt(18)

    p_decl = doc.add_paragraph()
    p_decl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_decl.paragraph_format.space_after = Pt(24)
    r_decl = p_decl.add_run("DECLARATION")
    r_decl.font.name = 'Times New Roman'
    r_decl.font.size = Pt(16)
    r_decl.bold = True
    r_decl.underline = True

    add_para(
        "I hereby declare that the internship report entitled \"SCADA DATA ANALYTICS & MACHINE LEARNING DASHBOARD\" "
        "submitted to the Department of Information Technology, Aditya University, is a record of original work carried "
        "out by me during the summer Internship period under the guidance of Mr. Patnala Pattabhirama Mohan, "
        "Assistant Professor, Department of DS. We further declare that this work has not been submitted elsewhere "
        "for any degree or diploma.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=36, indent=0.5
    )

    p_sig_decl = doc.add_paragraph()
    p_sig_decl.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_sig_decl.paragraph_format.space_before = Pt(72)
    sig_decl_text = (
        "Date: 25.June.2026                                                                    Student Signatures:\n"
        "                                                                                      _____________________\n"
        "                                                                                      1. K.Laxmi Priya (23A91A4429)\n"
        "                                                                                      2. SK.Mahaboobinnisa (23A91A4459)\n"
        "                                                                                      3. V.Likhitha (23A91A4465)"
    )
    r_sig_decl = p_sig_decl.add_run(sig_decl_text)
    r_sig_decl.font.name = 'Times New Roman'
    r_sig_decl.font.size = Pt(11)
    r_sig_decl.bold = True

    # ================= PAGE 4: ACKNOWLEDGEMENT =================
    doc.add_page_break()
    add_heading_1("Acknowledgement")
    
    add_para(
        "It is with immense pleasure that we would like to express our indebted gratitude to our project guide "
        "Mr. Patnala Pattabhirama Mohan, Assistant Professor, Department of Information Technology, who has "
        "guided us a lot and encouraged us in every step of the project work. His valuable moral support and guidance "
        "throughout the project helped us to a greater extent."
    )
    add_para(
        "We are grateful to Dr. Raja Babu, HOD, for inspiring us all the way and for arranging all the facilities and "
        "resources needed for our project."
    )
    add_para(
        "We wish to thank our Dr. M.V. Rajesh, Associate Dean (School of Engineering), Dr. A Ramesh, Pro Vice-Chancellor "
        "(Engineering & Sciences), Dr. S. Rama Sree, Pro Vice-Chancellor (Academics), and Dr. G. Suresh, Registrar, "
        "for their encouragement and support during the course of our project."
    )
    add_para(
        "We would like to extend our sincere thanks to Dr. M. B. Srinivas, Vice-Chancellor, Dr. M. Sreenivasa Reddy, "
        "Deputy Pro-Chancellor and Management, Aditya University, for their unconditional support in providing us with the "
        "best infrastructural facilities and state-of-the-art laboratories during our project."
    )
    add_para(
        "Not to forget, Non-Teaching Staff and our Friends who have directly or indirectly supported us in completing this project on time."
    )

    p_ack_sig = doc.add_paragraph()
    p_ack_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_ack_sig.paragraph_format.space_before = Pt(48)
    ack_sig_text = (
        "Submitted by:\n"
        "K.Laxmi Priya (23A91A4429)\n"
        "SK.Mahaboobinnisa (23A91A4459)\n"
        "V.Likhitha (23A91A4465)"
    )
    r_ack_sig = p_ack_sig.add_run(ack_sig_text)
    r_ack_sig.font.name = 'Times New Roman'
    r_ack_sig.font.size = Pt(11)
    r_ack_sig.bold = True

    # ================= PAGE 5: INTERNSHIP COMPLETION CERTIFICATE =================
    doc.add_page_break()
    add_heading_1("Internship Completion Certificate")
    
    p_cert_placeholder = doc.add_paragraph()
    p_cert_placeholder.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cert_placeholder.paragraph_format.space_after = Pt(18)
    r_cp = p_cert_placeholder.add_run("[Placeholder for Scanned Technical Hub Certificate]")
    r_cp.font.name = 'Times New Roman'
    r_cp.font.size = Pt(12)
    r_cp.bold = True
    r_cp.italic = True

    # Styled Table Mockup of Certificate
    table = doc.add_table(rows=8, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)
    
    rows = table.rows
    for r in rows:
        set_cell_background(r.cells[0], "FCFBF7")
        set_cell_margins(r.cells[0], top=120, bottom=120, left=200, right=200)

    # 1. Header
    p0 = rows[0].cells[0].paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p0.add_run("TECHNICAL HUB\n")
    r.bold = True; r.font.size = Pt(14); r.font.color.rgb = RGBColor(30, 58, 138)
    r_d = p0.add_run("Date of Issue: 26-06-2026")
    r_d.font.size = Pt(9); r_d.italic = True
    
    # 2. Title
    p1 = rows[1].cells[0].paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p1.add_run("CERTIFICATE OF INTERNSHIP")
    r.bold = True; r.font.size = Pt(16); r.font.color.rgb = RGBColor(180, 83, 9)
    
    # 3. Body
    p2 = rows[2].cells[0].paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p2.add_run(
        "This is to certify that Ms. Katta Laxmipriya, of the Data Science department with Roll No: 23A91A4429 "
        "of Aditya Engineering College has successfully completed a summer internship with Technical Hub Pvt Ltd "
        "from 04-05-2026 to 26-06-2026.\n\n"
        "During this tenure, the trainee worked with the technology Data Specialist and excelled in major concepts:"
    )
    r.font.size = Pt(10.5)

    # 4. Concepts List
    p3 = rows[3].cells[0].paragraphs[0]
    p3.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p3.add_run(
        " • Cloud Data Engineering & Analytics\n"
        " • Enterprise Workflow Automation\n"
        " • AI-Powered Low-Code Business Applications\n"
        " • Real-Time Monitoring & Smart Dashboards"
    )
    r.font.size = Pt(10); r.bold = True
    
    # 5. Footer details
    p4 = rows[4].cells[0].paragraphs[0]
    p4.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p4.add_run(
        "The trainee has a great amount of responsibility, sincerity, and a genuine willingness to learn new things. "
        "We found the trainee's performance and conduct were satisfactory. We wish you all the best and success in your future endeavors."
    )
    r.font.size = Pt(10); r.italic = True
    
    # 6. ID
    p5 = rows[5].cells[0].paragraphs[0]
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p5.add_run("Intern ID: THSI260131")
    r.bold = True; r.font.size = Pt(9.5)

    # 7. Signature & Seal
    p6 = rows[6].cells[0].paragraphs[0]
    p6.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p6.add_run(
        "Technical Hub Seal: [SEALED]                                                          BABJI NEELAM\n"
        "                                                                                      Founder & CEO, Technical Hub"
    )
    r.font.size = Pt(9.5); r.bold = True

    # 8. Affiliations
    p7 = rows[7].cells[0].paragraphs[0]
    p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p7.add_run("MSME Govt of India  |  RedHat  |  Pega  |  Automation Anywhere  |  mile2")
    r.font.size = Pt(8.5); r.font.color.rgb = RGBColor(156, 163, 175)

    # ================= PAGE 6: ABSTRACT =================
    doc.add_page_break()
    add_heading_1("1. ABSTRACT")
    
    add_para(
        "The SCADA Data Analytics & Machine Learning Dashboard is a high-performance, responsive web application "
        "designed to act as an intelligent analytics extension to traditional industrial SCADA (Supervisory Control and Data Acquisition) "
        "monitors. Standard SCADA systems show raw sensor feeds but lack advanced visual trendings, automated multi-variable analytics, "
        "and predictive maintenance tools. This project bridges this gap by simulating real-time telemetry streaming "
        "(temperature, pressure, vibration, voltage, and current) from 5 virtual PLC machines (MC_01 to MC_05) and applying "
        "machine learning to predict machine health and equipment failures."
    )
    add_para(
        "The system uses a decoupled, full-stack architecture: a FastAPI (Python) backend handles dataset polling, "
        "threshold-rule evaluation, and ML predictions, while a Next.js (TypeScript, React) frontend provides an interactive, "
        "responsive dashboard. The backend incorporates a pre-trained Random Forest Classifier model trained via Scikit-learn "
        "to analyze live telemetry and estimate failure probabilities in real time. It also features a rule-based alert engine "
        "that monitors safe thresholds (e.g., Temperature > 80°C, Vibration > 5.0 mm/s) and populates a dynamic alarm log."
    )
    add_para(
        "Using Pandas and NumPy, the backend processes the raw sensor CSV logs to compute system averages, peak variables, "
        "and active electrical loads (kW), immediately highlighting the highest energy consumer. The frontend uses Recharts "
        "to plot interactive multi-variable charts that reveal historical operational trends. This MVP demonstrates how modern "
        "web applications and data science techniques can supplement heavy industrial environments to prevent costly shutdowns "
        "and optimize resource utilization."
    )

    # ================= PAGE 7: SDG MAPPING =================
    doc.add_page_break()
    add_heading_1("2. SDG MAPPING")
    
    add_para(
        "The SCADA Data Analytics & Machine Learning Dashboard project aligns with the United Nations Sustainable Development Goals (SDGs) "
        "by utilizing modern programming technologies and data science to optimize industrial efficiency, secure cleaner energy metrics, "
        "and safeguard operator environments."
    )
    
    add_heading_3("SDG 9 – Industry, Innovation, and Infrastructure")
    add_para(
        "This project is directly connected to SDG 9. Traditional SCADA infrastructures show raw numbers but do not predict failures. "
        "By integrating a Random Forest Classifier trained in Scikit-learn, this system introduces predictive maintenance (PdM). "
        "Early diagnostics allow technicians to service parts before a physical breakdown occurs. This prevents major equipment "
        "failures, cuts maintenance costs, and fosters resilient, modern industrial infrastructures."
    )
    
    add_heading_3("SDG 12 – Responsible Consumption and Production")
    add_para(
        "A core analytics feature of the application is the calculation of active electrical load (kW) and identifying the highest "
        "energy-consuming machine. By providing factory operators with clear, transparent metrics on electricity consumption, the "
        "dashboard supports resource conservation. Factories can identify energy-hogging equipment, coordinate load cycles, and "
        "minimize power waste, promoting sustainable production."
    )
    
    add_heading_3("SDG 8 – Decent Work and Economic Growth")
    add_para(
        "Industrial machinery failure can result in physical hazards for shop-floor technicians. The automated rule-based alarm system "
        "(monitoring dangerous limits of temperature, vibration, voltage, and current) provides early alerts. These instant warning "
        "dispatches promote employee safety and ensure a secure working environment, which supports steady economic productivity and "
        "decent work guidelines."
    )

    # ================= PAGE 8: INTRODUCTION =================
    doc.add_page_break()
    add_heading_1("INTRODUCTION")
    
    add_para(
        "In modern manufacturing facilities, machines and production lines run continuously, streaming massive volumes of sensor telemetry "
        "to centralized displays. Traditionally, these readings are monitored by operators using standard SCADA (Supervisory Control and Data Acquisition) "
        "or HMI (Human Machine Interface) panels. However, standard panels usually display only current numbers and have static boundaries. "
        "When anomalies happen or multiple minor variables combine to cause a system breakdown, basic screens do not help operators "
        "predict the failure or discover which machine is operating inefficiently."
    )
    add_para(
        "The SCADA Data Analytics & Machine Learning Dashboard is a software solution that addresses these limitations. Rather than acting "
        "as a full industrial hardware controller, this project is designed as an analytics wrapper around a SCADA CSV telemetry pipeline. "
        "It imports raw sensor logs (temperature, pressure, vibration, voltage, current) from virtual PLC nodes, handles data cleaning, "
        "calculates power statistics, evaluates safety rules, and generates health predictions using a pre-trained Random Forest model."
    )
    add_para(
        "The system uses a modern web architecture. The FastAPI backend provides responsive REST endpoints, and the Next.js frontend "
        "provides a responsive interface. This ensures that operators can view operations on various devices, from office screens to mobile "
        "phones. By combining web development with data science libraries (Pandas and Scikit-learn), the project shows how factories "
        "can add predictive maintenance capabilities to their operations without expensive hardware overhauls."
    )

    # ================= PAGE 9: OBJECTIVES =================
    doc.add_page_break()
    add_heading_1("OBJECTIVES")
    
    add_heading_3("Objective 1: Build a Live SCADA Telemetry Simulation Stream")
    add_para(
        "Create a data polling flow that reads a historical CSV log containing sensor logs from 5 virtual machine nodes (MC_01 to MC_05). "
        "The frontend polls this API every 5 seconds to simulate a live sensor stream, showing Temperature, Pressure, Vibration, Voltage, and Current."
    )
    
    add_heading_3("Objective 2: Integrate a Predictive Maintenance ML Sandbox")
    add_para(
        "Develop a predictive module utilizing a pre-trained Random Forest Classifier. The sandbox should allow operators to input "
        "sensor configurations (temperature, vibration, pressure, current, voltage) and receive failure probabilities along with system recommendations."
    )
    
    add_heading_3("Objective 3: Implement an Automated Alarm Dispatch System")
    add_para(
        "Formulate rules that monitor the incoming telemetry. If parameters exceed limits (e.g., Temperature > 80°C or Vibration > 5.0 mm/s), "
        "the system must generate a warning or critical alarm in the dashboard's alert log."
    )
    
    add_heading_3("Objective 4: Provide Deep Data Analytics and Energy Calculations")
    add_para(
        "Use Pandas to calculate aggregate averages, identify peak values, and compute the active electrical load (kW) of each machine. "
        "The dashboard must automatically identify the highest consumer of energy."
    )
    
    add_heading_3("Objective 5: Construct a Scalable Decoupled Architecture")
    add_para(
        "Build a decoupled layout using Next.js (TypeScript, React) and FastAPI (Python). The backend must support uploading custom telemetry "
        "CSV sheets and resetting the simulation data configuration."
    )

    # ================= PAGE 10: METHODOLOGY =================
    doc.add_page_break()
    add_heading_1("METHODOLOGY")
    
    add_para(
        "The development of the SCADA Data Analytics & Machine Learning Dashboard followed a structured system engineering approach:"
    )
    add_para(
        "First, a mock dataset representing 7 days of 5-minute interval sensor readings from 5 PLC machines was generated. "
        "This data covers normal operation and simulated failure conditions (e.g., high vibration and temperature spikes)."
    )
    add_para(
        "Second, the FastAPI backend was built. A data service was written using Pandas to load the CSV, stream rows during polling, "
        "and calculate averages. A model training script evaluated various classifiers (Logistic Regression, Decision Trees, and Random Forests). "
        "The Random Forest model achieved the highest classification accuracy and was saved to model.pkl."
    )
    add_para(
        "Third, the Next.js frontend was set up. Dynamic UI dashboards, trend lines using Recharts, and rule-based visual badges were "
        "created to display live telemetry."
    )

    add_heading_3("Tools, Platforms, and Programming Languages Used")
    
    # Table of Tools
    tools_table = doc.add_table(rows=8, cols=2)
    tools_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tools_table)
    
    # Set header row
    hdr_cells = tools_table.rows[0].cells
    hdr_cells[0].text = "Category"
    hdr_cells[1].text = "Technology"
    for cell in hdr_cells:
        set_cell_background(cell, "F2F2F2")
        cell.paragraphs[0].runs[0].bold = True
        set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
        
    data = [
        ("Frontend", "Next.js, React.js, TypeScript, Tailwind CSS, Shadcn UI"),
        ("Backend", "FastAPI, Python, Uvicorn"),
        ("Data Processing", "Pandas, NumPy"),
        ("Machine Learning", "Scikit-learn (Random Forest Classifier)"),
        ("Visualization", "Recharts (React trend charts), Lucide React (Icons)"),
        ("Database / Data Source", "CSV File (7-day simulated PLC sensor telemetry log)"),
        ("Development Tools", "Visual Studio Code, Git, GitHub")
    ]
    
    for idx, (cat, tech) in enumerate(data, start=1):
        cells = tools_table.rows[idx].cells
        cells[0].text = cat
        cells[1].text = tech
        cells[0].paragraphs[0].runs[0].bold = True
        for cell in cells:
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)

    # ================= PAGE 11: IMPLEMENTATION =================
    doc.add_page_break()
    add_heading_1("IMPLEMENTATION")
    
    add_para(
        "The implementation of the dashboard is split into the backend/ and frontend/ directories:"
    )
    
    add_heading_2("1. Backend Development (FastAPI & ML)")
    add_para(
        "Data Ingestion: Located in backend/app/services/data_service.py, this service uses Pandas to parse the telemetry file. "
        "It handles simulation polling and resets. ML Classifier: Developed in backend/ml/train_model.py. The script trains a "
        "Random Forest Classifier using features: Temperature, Pressure, Vibration, Voltage, Current. The trained model is saved "
        "as model.pkl in backend/app/models/ and loaded during FastAPI startup to handle dynamic predictions. API Router: "
        "In backend/app/controllers/sensor_controller.py, REST endpoints return live telemetry data, aggregated analytics, "
        "failure predictions, and handle CSV uploads.",
        indent=0.5
    )
    
    add_heading_2("2. Frontend Development (Next.js & Recharts)")
    add_para(
        "Telemetry Cards: Built in frontend/app/page.tsx, displaying live Temperature, Pressure, Vibration, Voltage, and Current. "
        "Dynamic badges change colors (Green, Yellow, Red) based on threshold logic. Trend Charts: Built using Recharts, creating "
        "responsive line charts that display multi-variable trends over time. Sandbox Predictor: Interactive sliders allow "
        "operators to adjust telemetry values and query the backend ML model to observe changes in failure probability.",
        indent=0.5
    )

    # ================= PAGE 12: RESULTS & OUTCOMES =================
    doc.add_page_break()
    add_heading_1("RESULTS & OUTCOMES")
    
    add_para(
        "The SCADA Data Analytics & Machine Learning Dashboard was successfully developed and tested as a functional web application "
        "prototype. The decoupled services communicate reliably on localhost."
    )
    
    add_para(
        "[Telemetry Visualization Graph Mockup included in final build showing temperature & vibration curves over time.]",
        align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12, indent=0, bold=True, italic=True
    )
    
    add_heading_3("Key Project Outcomes:")
    add_para(
        " • Simulated Telemetry Polling: The Next.js frontend updates every 5 seconds, displaying values from the active sensor array.\n"
        " • Rule-Based Alarm Log: Instantly displays warnings when temperature crosses 80°C or vibration exceeds 5.0 mm/s.\n"
        " • Random Forest Classification: Integrates predictions into the dashboard, displaying the probability of machine failure.\n"
        " • Statistical Summaries: Generates average metrics for each machine, identifies peaks, and calculates active load to flag the highest energy consumer.\n"
        " • CSV Operations: Operators can upload new dataset files, supporting testing across different operational distributions.",
        align=WD_ALIGN_PARAGRAPH.LEFT, space_after=12, indent=0
    )

    # ================= PAGE 13: KEY LEARNINGS =================
    doc.add_page_break()
    add_heading_1("KEY LEARNINGS")
    
    add_para(
        "The development of the SCADA Data Analytics & Machine Learning Dashboard provided hands-on experience in full-stack web development and data science:"
    )
    
    add_heading_3("1. Web Frameworks & API Architectures")
    add_para(
        "Building the application using FastAPI highlighted the value of structured endpoints and automated schemas in Python. "
        "Connecting it to React and Next.js demonstrated how to manage asynchronous state polling, handle CORS rules, and structure dynamic components."
    )
    
    add_heading_3("2. Practical Data Processing")
    add_para(
        "Using Pandas for live data slicing was a key learning. Slicing rows dynamically, calculating running metrics, and handling "
        "missing telemetry values showed how database files can support simulated feeds."
    )
    
    add_heading_3("3. Model Serialization and Serving")
    add_para(
        "Training the machine learning model in a separate script (train_model.py) and saving it using pickle (model.pkl) "
        "showed how models are deployed. Loading this file at API start and running fast predictions showed how to serve ML models in production."
    )
    
    add_heading_3("4. Professional Engineering Skills")
    add_para(
        "Breaking down a project into an MVP development checklist taught valuable planning skills. The internship helped improve "
        "problem-solving, debugging CORS issues, managing NPM packages, and configuring Python virtual environments."
    )

    # ================= PAGE 14: CONCLUSION & FUTURE SCOPE =================
    doc.add_page_break()
    add_heading_1("CONCLUSION & FUTURE SCOPE")
    
    add_heading_3("Conclusion")
    add_para(
        "The SCADA Data Analytics & Machine Learning Dashboard successfully demonstrates how to build an analytical wrapper for "
        "SCADA telemetry data. By combining FastAPI and Next.js with data science libraries (Pandas and Scikit-learn), the system "
        "provides interactive dashboard analytics, rule-based alarm alerts, and machine health predictions."
    )
    add_para(
        "The pre-trained Random Forest model achieves high classification accuracy, validating that simple ML models can estimate "
        "failure risks based on temperature, pressure, vibration, voltage, and current. This MVP highlights how data science can "
        "add predictive capabilities to raw factory monitoring systems."
    )
    
    add_heading_3("Future Scope")
    add_para(
        " • Direct PLC Communication: Replace the CSV file simulation with active protocols like OPC UA or Modbus to stream data directly from physical PLCs.\n"
        " • Time-Series Databases: Integrate specialized databases like InfluxDB or TimescaleDB to handle high-frequency sensor inputs efficiently.\n"
        " • Deep Learning Classifiers: Test and evaluate time-series deep learning models (such as LSTMs) to forecast machine failures hours in advance.\n"
        " • Webhook Notifications: Integrate third-party email, Slack, or Twilio SMS APIs to dispatch warning alerts to off-site maintenance engineers automatically.",
        align=WD_ALIGN_PARAGRAPH.LEFT, space_after=12, indent=0
    )

    # ================= PAGE 15: OUTCOMES =================
    doc.add_page_break()
    add_heading_1("OUTCOMES")
    
    add_para(
        "The successful implementation of the SCADA Data Analytics dashboard resulted in several outcomes that align with modern industrial requirements:"
    )
    add_para(
        "First, it provides a centralized web dashboard that integrates data analytics and machine learning. Instead of using separate tools "
        "for visual graphing, statistics, and machine diagnostics, operators can monitor all three in one place."
    )
    add_para(
        "Second, it demonstrates the value of using pre-trained machine learning classifiers to predict equipment failures. By analyzing "
        "multi-variable relationships (such as voltage anomalies combined with vibration spikes), the system can warn operators of failure "
        "risks before a single threshold is breached."
    )
    add_para(
        "Third, the decoupled backend structure is scalable. Because the API endpoints return standard JSON data, the frontend can be "
        "extended to include mobile apps or smartwatch notifications without modifying the data analysis engine."
    )
    
    add_heading_3("Key Deliverables Completed:")
    add_para(
        " • Completed a working web prototype running on FastAPI and Next.js.\n"
        " • Simulated live telemetry feeds (temperature, pressure, vibration, voltage, current) for 5 machines.\n"
        " • Developed automated threshold alerts for dangerous machine conditions.\n"
        " • Integrated a pre-trained Random Forest model for failure probability predictions.\n"
        " • Provided detailed averages and identified the highest energy-consuming machine.",
        align=WD_ALIGN_PARAGRAPH.LEFT, space_after=12, indent=0
    )

    # ================= PAGE 16: PRODUCT DEVELOPMENT =================
    doc.add_page_break()
    add_heading_1("Product Development")
    
    add_para(
        "The internship project was completed as a product development cycle, moving from requirements gathering to testing:"
    )
    
    add_heading_3("1. Requirements and Architecture Design")
    add_para(
        "The product requirements specified that the dashboard must display telemetry trends, calculate energy metrics, trigger threshold alerts, "
        "and provide machine health predictions. A decoupled architecture (FastAPI backend + Next.js frontend) was selected to ensure the application is responsive and scalable."
    )
    
    add_heading_3("2. Backend and ML Development")
    add_para(
        "A Python script generated simulated sensor readings, creating normal, warning, and failure patterns. Pandas was used to build the "
        "data service layer. A Random Forest model was selected for classification due to its performance, and was saved as model.pkl using pickle."
    )
    
    add_heading_3("3. Frontend and Visuals")
    add_para(
        "The Next.js user interface was styled with CSS and Tailwind. Cards display real-time sensor values, and Recharts line graphs "
        "show historical trends. A prediction sandbox was added, allowing operators to input values and query the ML model."
    )
    
    add_heading_3("4. Integration and Testing")
    add_para(
        "The frontend and backend were connected using standard REST APIs. Testing validated that the dashboard updates every 5 seconds, "
        "alerts trigger correctly, and ML model predictions return without errors."
    )

    # ================= PAGE 17: ABOUT THE COMPANY =================
    doc.add_page_break()
    add_heading_1("ABOUT THE COMPANY")
    
    add_para(
        "Technical Hub Pvt. Ltd. is a technology training and innovation company established in 2016. The organization focuses on bridging "
        "the gap between academic education and industry requirements. It provides high-quality training, internships, certification programs, "
        "and project-based learning in emerging technologies such as Artificial Intelligence, Data Science, Cloud Computing, Full Stack Development, "
        "Cyber Security, DevOps, IoT, and Robotic Process Automation (RPA).",
        indent=0.5
    )
    add_para(
        "The company collaborates with educational institutions and industry partners to deliver real-world learning experiences through workshops, "
        "hackathons, internships, coding contests, placement training, and innovation programs. During the internship, students gain practical "
        "exposure to current technologies while working on industry-level projects under the guidance of experienced mentors. Technical Hub "
        "emphasizes problem-solving, teamwork, communication skills, and continuous learning, enabling students to develop their professional "
        "and technical capabilities.",
        indent=0.5
    )
    
    add_heading_3("Mission:")
    add_para(
        "To empower students and professionals with industry-relevant technical skills through innovative learning, practical training, "
        "real-world projects, and continuous mentorship, thereby enhancing employability and career growth.",
        indent=0
    )
    
    add_heading_3("Vision:")
    add_para(
        "To become a globally recognized technology learning and innovation platform that nurtures skilled professionals, promotes innovation, "
        "and bridges the gap between academia and industry through advanced technical education and hands-on experience.",
        indent=0
    )

    # Save
    filename = "SCADA_Internship_Report.docx"
    doc.save(filename)
    print(f"Document saved successfully as '{filename}'.")

if __name__ == "__main__":
    build_report()
