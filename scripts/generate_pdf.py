
from fpdf import FPDF
import sys

# Custom PDF class layout
class ReportPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Cortex Clash - Technical Audit Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, 'Page ' + str(self.page_no()) + '/{nb}', 0, 0, 'C')

def create_pdf(output_filename):
    pdf = ReportPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font('Arial', '', 12)

    # Content
    # We will basically hardcode the structure mapping for simplicity 
    # to avoid complex md parsing risks in this environment
    
    # 1. Executive Summary
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '1. Executive Summary', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.multi_cell(0, 7, "Project Status: Late-Stage Beta / Pre-Production\n\nThe Cortex Clash platform demonstrates a robust implementation of core tournament features, authentication, and real-time updates. The architecture is sound, utilizing a microservices-lite approach for AI features. However, critical deployment blockers exist regarding the ML service integration and environment configuration. The project is not yet production-ready due to hardcoded local URLs and missing deployment infrastructure for the Python service.")
    pdf.ln(5)

    # 2. Architecture Overview
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '2. Architecture Overview', 0, 1)
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'System Diagram & Interaction', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.multi_cell(0, 7, "1. Frontend (Client): React + Vite\n   - Serves as the UI for Players, Organizers, and Admins.\n   - Communicates with Backend via REST API.\n   - Real-time updates via Socket.IO.\n   - Hosting: GitHub Pages.\n\n2. Backend (Server): Node.js + Express\n   - Orchestrates logic, DB, and Auth.\n   - Database: MongoDB Atlas.\n   - Hosting: Render.\n\n3. ML Service: FastAPI (Python)\n   - Win probability and anomaly detection.\n   - Hosting: Pending (Local-only).")
    pdf.ln(5)
    
    # 3. Feature Completion Status
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '3. Feature Completion Status', 0, 1)
    pdf.set_font('Arial', '', 10)
    
    # Table Header
    pdf.set_fill_color(200, 220, 255)
    pdf.cell(45, 10, 'Feature Cluster', 1, 0, 'C', True)
    pdf.cell(30, 10, 'Status', 1, 0, 'C', True)
    pdf.cell(115, 10, 'Notes / Issues', 1, 1, 'C', True)
    
    # Table Rows
    data = [
        ("Authentication", "Complete", "JWT/Bcrypt/Roles implemented."),
        ("Tournament Sys", "Complete", "Creation, Brackets, Results."),
        ("Real-time", "Partial", "Socket.IO implemented, needs CORS test."),
        ("Ranking System", "Complete", "Elo, Seasons. CRITICAL: Hardcoded ML URL."),
        ("Game Logic", "Complete", "Generic Game model supported."),
        ("Seasons", "Complete", "Active season tracking."),
        ("Admin Panel", "Complete", "Full management features."),
        ("AI Prediction", "Partial", "Model ready. Deployment MISSING."),
        ("Integrity Sys", "Complete", "Anomaly detection logic ready."),
        ("Analytics", "Partial", "Basic stats only."),
    ]
    
    for feature, status, note in data:
        pdf.cell(45, 10, feature, 1)
        pdf.cell(30, 10, status, 1)
        pdf.cell(115, 10, note, 1, 1)
    
    pdf.ln(5)
    pdf.set_font('Arial', '', 12)

    # 4. Production Readiness
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '4. Production Readiness Evaluation', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.set_text_color(0, 100, 0)
    pdf.cell(0, 10, 'PROD READY: Frontend Build, DB Schema, API Security.', 0, 1)
    pdf.set_text_color(200, 150, 0)
    pdf.cell(0, 10, 'NEEDS IMPROVEMENT: CORS Config, Error Handling.', 0, 1)
    pdf.set_text_color(200, 0, 0)
    pdf.multi_cell(0, 7, "CRITICAL BLOCKERS:\n1. Hardcoded ML Service URL (localhost stuck in code).\n2. No deployment config for ML Service.\n3. Missing environment variables.")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    # 5. Risks
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '5. Technical Debt & Risks', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.multi_cell(0, 7, "- Critical: Node backend coupled to local ML service. Fails in prod.\n- Critical: JWT_SECRET hardcoded fallback is unsafe.\n- Scalability: Synchronous ML calls block request threads.")
    pdf.ln(5)
    
    # 6. Requirements
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '6. Requirements for v1.0', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.multi_cell(0, 7, "1. Deploy ML Service to public URL.\n2. Add ML_SERVICE_URL to backend config.\n3. Enable Security Headers (xss-clean).\n4. Finalize Frontend deployment to GitHub Pages.")
    pdf.ln(5)
    
    # 7. Overall
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '7. Completion Estimate', 0, 1)
    pdf.set_font('Arial', '', 12)
    pdf.cell(0, 10, 'Backend: 90% | Frontend: 85% | ML: 80% | DevOps: 40%', 0, 1)
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'OVERALL PROJECT STATUS: 75%', 0, 1)

    pdf.output(output_filename, 'F')
    print(f"PDF generated: {output_filename}")

if __name__ == "__main__":
    create_pdf('Technical_Audit_Report.pdf')
