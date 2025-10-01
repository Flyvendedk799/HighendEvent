"""PDF generation utilities."""

from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

from app.models import Booking


def generate_invoice_pdf(booking: Booking) -> bytes:
    """Generate PDF invoice for a booking."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm)
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10
    )
    
    # Build content
    story = []
    
    # Title
    story.append(Paragraph("FAKTURA", title_style))
    story.append(Spacer(1, 20))
    
    # Invoice details
    invoice_data = [
        ['Faktura nr.:', booking.booking_no],
        ['Dato:', datetime.now().strftime('%d/%m/%Y')],
        ['Status:', booking.status.value.title()],
    ]
    
    invoice_table = Table(invoice_data, colWidths=[4*cm, 8*cm])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(invoice_table)
    story.append(Spacer(1, 20))
    
    # Customer details
    story.append(Paragraph("Kundeoplysninger", heading_style))
    
    customer_data = [
        ['Navn:', booking.customer_name],
        ['E-mail:', booking.email],
        ['Telefon:', booking.phone],
        ['Adresse:', f"{booking.address}, {booking.zip_code} {booking.city}"],
    ]
    
    customer_table = Table(customer_data, colWidths=[4*cm, 8*cm])
    customer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(customer_table)
    story.append(Spacer(1, 20))
    
    # Booking details
    story.append(Paragraph("Bookingdetaljer", heading_style))
    
    booking_data = [
        ['Periode:', f"{booking.start_date.strftime('%d/%m/%Y')} - {booking.end_date.strftime('%d/%m/%Y')}"],
        ['Antal dage:', str((booking.end_date - booking.start_date).days + 1)],
    ]
    
    booking_table = Table(booking_data, colWidths=[4*cm, 8*cm])
    booking_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(booking_table)
    story.append(Spacer(1, 20))
    
    # Items table
    story.append(Paragraph("Varer", heading_style))
    
    # Table headers
    headers = ['Vare', 'Antal', 'Pris pr. stk.', 'Total']
    items_data = [headers]
    
    # Add booking items
    for item in booking.items:
        items_data.append([
            item.name_snapshot,
            str(item.quantity),
            f"{item.unit_price_dkk:.2f} DKK",
            f"{item.unit_price_dkk * item.quantity:.2f} DKK"
        ])
        
        # Add upsell items for this booking item
        for upsell in item.upsell_items:
            items_data.append([
                f"  └ {upsell.name_snapshot} (tilkøb)",
                str(upsell.quantity),
                f"{upsell.unit_price_dkk:.2f} DKK",
                f"{upsell.unit_price_dkk * upsell.quantity:.2f} DKK"
            ])
    
    # Add delivery fee if applicable
    if booking.delivery_fee_dkk > 0:
        items_data.append([
            'Levering',
            '1',
            f"{booking.delivery_fee_dkk:.2f} DKK",
            f"{booking.delivery_fee_dkk:.2f} DKK"
        ])
        
        # Add delivery fee breakdown if available
        if hasattr(booking, 'delivery_breakdown') and booking.delivery_breakdown:
            breakdown = booking.delivery_breakdown
            if breakdown.get('base_fee', 0) > 0:
                items_data.append([
                    '  - Basisgebyr',
                    '',
                    f"{breakdown['base_fee']:.2f} DKK",
                    f"{breakdown['base_fee']:.2f} DKK"
                ])
            if breakdown.get('chargeable_km', 0) > 0 and breakdown.get('km_fee', 0) > 0:
                items_data.append([
                    f"  - {breakdown['chargeable_km']} km × {breakdown['per_km_fee']:.2f} DKK",
                    '',
                    f"{breakdown['km_fee']:.2f} DKK",
                    f"{breakdown['km_fee']:.2f} DKK"
                ])
            if breakdown.get('distance_km'):
                items_data.append([
                    f"  - Afstand: {breakdown['distance_km']} km",
                    '',
                    '',
                    ''
                ])
    
    items_table = Table(items_data, colWidths=[6*cm, 2*cm, 3*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(items_table)
    story.append(Spacer(1, 20))
    
    # Calculate upsell total
    upsell_total = Decimal('0')
    for item in booking.items:
        for upsell in item.upsell_items:
            upsell_total += upsell.unit_price_dkk * upsell.quantity
    
    # Totals
    totals_data = [
        ['Subtotal:', f"{booking.subtotal_dkk:.2f} DKK"],
        ['Moms (25%):', f"{booking.vat_dkk:.2f} DKK"],
    ]
    
    if booking.delivery_fee_dkk > 0:
        totals_data.append(['Leveringsgebyr:', f"{booking.delivery_fee_dkk:.2f} DKK"])
    
    if upsell_total > 0:
        totals_data.append(['Tilkøb:', f"{upsell_total:.2f} DKK"])
    
    if booking.deposit_dkk > 0:
        totals_data.append(['Depositum:', f"{booking.deposit_dkk:.2f} DKK"])
    
    totals_data.append(['', ''])  # Empty row
    
    # Calculate total including upsells
    final_total = booking.total_dkk + upsell_total
    totals_data.append(['TOTAL:', f"{final_total:.2f} DKK"])
    
    totals_table = Table(totals_data, colWidths=[8*cm, 4*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.black),
    ]))
    
    story.append(totals_table)
    story.append(Spacer(1, 30))
    
    # Notes
    if booking.notes:
        story.append(Paragraph("Bemærkninger", heading_style))
        story.append(Paragraph(booking.notes, normal_style))
        story.append(Spacer(1, 20))
    
    # Footer
    footer_text = """
    <para align="center">
    <b>Tak for din booking!</b><br/>
    Kontakt os hvis du har spørgsmål til din booking.
    </para>
    """
    story.append(Paragraph(footer_text, normal_style))
    
    # Build PDF
    doc.build(story)
    
    # Get PDF data
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data

