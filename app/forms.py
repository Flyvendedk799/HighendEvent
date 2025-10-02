"""WTForms for the application."""

from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, TextAreaField, SelectField, DateField, IntegerField, BooleanField, PasswordField
from wtforms.validators import DataRequired, Email, Length, Optional, NumberRange, ValidationError, EqualTo
from wtforms.widgets import TextArea


class CheckoutForm(FlaskForm):
    """Checkout form for customer information."""
    customer_name = StringField(
        'Fulde navn',
        validators=[DataRequired(message='Navn er påkrævet'), Length(max=200)]
    )
    email = StringField(
        'E-mail',
        validators=[DataRequired(message='E-mail er påkrævet'), Email(message='Ugyldig e-mail adresse'), Length(max=200)]
    )
    phone = StringField(
        'Telefonnummer',
        validators=[DataRequired(message='Telefonnummer er påkrævet'), Length(max=20)]
    )
    address = StringField(
        'Adresse',
        validators=[DataRequired(message='Adresse er påkrævet'), Length(max=300)]
    )
    zip_code = StringField(
        'Postnummer',
        validators=[DataRequired(message='Postnummer er påkrævet'), Length(max=10)]
    )
    city = StringField(
        'By',
        validators=[DataRequired(message='By er påkrævet'), Length(max=100)]
    )
    delivery_type = SelectField(
        'Levering',
        choices=[('pickup', 'Afhentning'), ('delivery', 'Levering')],
        validators=[DataRequired()]
    )
    notes = TextAreaField(
        'Bemærkninger',
        validators=[Optional(), Length(max=1000)],
        render_kw={'rows': 3, 'placeholder': 'Eventuelle bemærkninger til din booking...'}
    )
    account_number = StringField(
        'Kontonummer',
        validators=[Optional(), Length(max=20)],
        render_kw={'placeholder': '1234567890'}
    )
    registration_number = StringField(
        'Registreringsnummer',
        validators=[Optional(), Length(max=10)],
        render_kw={'placeholder': '1234'}
    )


class LoginForm(FlaskForm):
    """Login form for admin users."""
    email = StringField(
        'E-mail',
        validators=[DataRequired(message='E-mail er påkrævet'), Email()]
    )
    password = PasswordField(
        'Adgangskode',
        validators=[DataRequired(message='Adgangskode er påkrævet')]
    )
    remember_me = BooleanField('Husk mig')


class ProductForm(FlaskForm):
    """Product form for admin."""
    name = StringField(
        'Navn',
        validators=[DataRequired(message='Navn er påkrævet'), Length(max=200)]
    )
    slug = StringField(
        'Slug',
        validators=[DataRequired(message='Slug er påkrævet'), Length(max=200)]
    )
    category_id = SelectField(
        'Kategori',
        coerce=int,
        validators=[DataRequired(message='Kategori er påkrævet')]
    )
    description = TextAreaField(
        'Beskrivelse',
        validators=[Optional(), Length(max=5000)],
        render_kw={'rows': 5}
    )
    daily_price_dkk = StringField(
        'Daglig pris (DKK)',
        validators=[DataRequired(message='Daglig pris er påkrævet')]
    )
    weekend_price_dkk = StringField(
        'Weekend pris pr. dag (Lør/Søn) (DKK)',
        validators=[Optional()]
    )
    weekend_discount_dkk = StringField(
        'Fuld weekend pris (Fre-Søn) (DKK)',
        validators=[Optional()]
    )
    deposit_dkk = StringField(
        'Depositum (DKK)',
        validators=[Optional()]
    )
    stock_qty = IntegerField(
        'Lagerantal',
        validators=[DataRequired(message='Lagerantal er påkrævet'), NumberRange(min=1, message='Lagerantal skal være mindst 1')]
    )
    prep_buffer_days = IntegerField(
        'Forberedelsesdage',
        validators=[Optional(), NumberRange(min=0, message='Forberedelsesdage skal være 0 eller mere')],
        default=0
    )
    cleanup_buffer_days = IntegerField(
        'Oprydningsdage',
        validators=[Optional(), NumberRange(min=0, message='Oprydningsdage skal være 0 eller mere')],
        default=0
    )
    is_active = BooleanField('Aktiv', default=True)
    hero_image_url = StringField(
        'Hero billede URL',
        validators=[Optional(), Length(max=500)]
    )
    hero_image_file = FileField(
        'Upload hero billede',
        validators=[
            Optional(),
            FileAllowed(['jpg', 'jpeg', 'png', 'gif', 'webp'], 'Kun billedfiler er tilladt (JPG, PNG, GIF, WebP)')
        ]
    )

    def validate_daily_price_dkk(self, field):
        """Validate daily price is a positive number."""
        try:
            price = float(field.data)
            if price < 0:
                raise ValidationError('Pris skal være positiv')
        except (ValueError, TypeError):
            raise ValidationError('Ugyldig pris format')

    def validate_weekend_price_dkk(self, field):
        """Validate weekend price is a positive number."""
        if field.data:
            try:
                price = float(field.data)
                if price < 0:
                    raise ValidationError('Pris skal være positiv')
            except (ValueError, TypeError):
                raise ValidationError('Ugyldig pris format')

    def validate_deposit_dkk(self, field):
        """Validate deposit is a positive number."""
        if field.data:
            try:
                price = float(field.data)
                if price < 0:
                    raise ValidationError('Depositum skal være positiv')
            except (ValueError, TypeError):
                raise ValidationError('Ugyldig depositum format')


class CategoryForm(FlaskForm):
    """Category form for admin."""
    name = StringField(
        'Navn',
        validators=[DataRequired(message='Navn er påkrævet'), Length(max=100)]
    )
    slug = StringField(
        'Slug',
        validators=[DataRequired(message='Slug er påkrævet'), Length(max=100)]
    )
    description = TextAreaField(
        'Beskrivelse',
        validators=[Optional(), Length(max=1000)],
        render_kw={'rows': 3}
    )
    sort_order = IntegerField(
        'Sorteringsrækkefølge',
        validators=[Optional()],
        default=0
    )
    is_active = BooleanField('Aktiv', default=True)


class BlackoutDateForm(FlaskForm):
    """Blackout date form for admin."""
    product_id = SelectField(
        'Produkt',
        coerce=int,
        validators=[DataRequired(message='Produkt er påkrævet')]
    )
    start_date = DateField(
        'Start dato',
        validators=[DataRequired(message='Start dato er påkrævet')]
    )
    end_date = DateField(
        'Slut dato',
        validators=[DataRequired(message='Slut dato er påkrævet')]
    )
    reason = StringField(
        'Årsag',
        validators=[Optional(), Length(max=200)]
    )

    def validate_end_date(self, field):
        """Validate end date is after start date."""
        if self.start_date.data and field.data:
            if field.data < self.start_date.data:
                raise ValidationError('Slut dato skal være efter start dato')


class CMSBlockForm(FlaskForm):
    """CMS block form for admin."""
    key = StringField(
        'Nøgle',
        validators=[DataRequired(message='Nøgle er påkrævet'), Length(max=100)]
    )
    title = StringField(
        'Titel',
        validators=[DataRequired(message='Titel er påkrævet'), Length(max=200)]
    )
    content_md = TextAreaField(
        'Indhold (Markdown)',
        validators=[DataRequired(message='Indhold er påkrævet')],
        render_kw={'rows': 10}
    )
    is_active = BooleanField('Aktiv', default=True)


class CompanyLocationForm(FlaskForm):
    """Company location form for admin."""
    name = StringField(
        'Navn',
        validators=[DataRequired(message='Navn er påkrævet'), Length(max=200)]
    )
    address = StringField(
        'Adresse',
        validators=[DataRequired(message='Adresse er påkrævet'), Length(max=300)]
    )
    zip_code = StringField(
        'Postnummer',
        validators=[DataRequired(message='Postnummer er påkrævet'), Length(max=10)]
    )
    city = StringField(
        'By',
        validators=[DataRequired(message='By er påkrævet'), Length(max=100)]
    )
    latitude = StringField(
        'Breddegrad',
        validators=[Optional()],
        render_kw={'placeholder': '55.6761 (valgfrit - beregnes automatisk)'}
    )
    longitude = StringField(
        'Længdegrad',
        validators=[Optional()],
        render_kw={'placeholder': '12.5683 (valgfrit - beregnes automatisk)'}
    )
    is_primary = BooleanField('Primær lokation', default=False)
    is_active = BooleanField('Aktiv', default=True)


class DeliverySettingForm(FlaskForm):
    """Delivery setting form for admin."""
    type = SelectField(
        'Type',
        choices=[('pickup', 'Afhentning'), ('delivery', 'Levering')],
        validators=[DataRequired(message='Type er påkrævet')]
    )
    base_fee_dkk = StringField(
        'Basisgebyr (DKK)',
        validators=[DataRequired(message='Basisgebyr er påkrævet')],
        render_kw={'placeholder': '0.00'}
    )
    per_km_fee_dkk = StringField(
        'Per km gebyr (DKK)',
        validators=[DataRequired(message='Per km gebyr er påkrævet')],
        render_kw={'placeholder': '0.00'}
    )
    free_delivery_km = IntegerField(
        'Gratis levering inden for (km)',
        validators=[DataRequired(message='Gratis levering km er påkrævet'), NumberRange(min=0)],
        default=0,
        render_kw={'placeholder': '0'}
    )
    max_delivery_km = IntegerField(
        'Maksimal leveringsafstand (km)',
        validators=[Optional(), NumberRange(min=1)],
        render_kw={'placeholder': 'Ubegrænset (tom)'}
    )
    notes = TextAreaField(
        'Bemærkninger',
        validators=[Optional(), Length(max=500)],
        render_kw={'rows': 3, 'placeholder': 'F.eks. Levering kun i hovedstadsområdet'}
    )
    is_active = BooleanField('Aktiv', default=True)

    def validate_base_fee_dkk(self, field):
        """Validate base fee is a positive number."""
        try:
            fee = float(field.data)
            if fee < 0:
                raise ValidationError('Gebyr skal være positiv')
        except (ValueError, TypeError):
            raise ValidationError('Ugyldig gebyr format')

    def validate_per_km_fee_dkk(self, field):
        """Validate per km fee is a positive number."""
        try:
            fee = float(field.data)
            if fee < 0:
                raise ValidationError('Per km gebyr skal være positiv')
        except (ValueError, TypeError):
            raise ValidationError('Ugyldig per km gebyr format')


class UpsellProductForm(FlaskForm):
    """Upsell product form for admin."""
    name = StringField(
        'Navn',
        validators=[DataRequired(message='Navn er påkrævet'), Length(max=200)]
    )
    description = TextAreaField(
        'Beskrivelse',
        validators=[Optional(), Length(max=2000)],
        render_kw={'rows': 4}
    )
    price_dkk = StringField(
        'Pris (DKK)',
        validators=[DataRequired(message='Pris er påkrævet')]
    )
    stock_qty = IntegerField(
        'Lager antal',
        validators=[DataRequired(message='Lager antal er påkrævet'), NumberRange(min=0)]
    )
    image = FileField(
        'Billede',
        validators=[Optional(), FileAllowed(['jpg', 'jpeg', 'png', 'gif', 'webp'], 'Kun billeder tilladt')]
    )
    is_active = BooleanField('Aktiv', default=True)
    
    def validate_price_dkk(self, field):
        """Validate price is a positive decimal."""
        try:
            price = float(field.data)
            if price < 0:
                raise ValidationError('Pris skal være positiv')
        except (ValueError, TypeError):
            raise ValidationError('Ugyldig pris format')


class CustomerRegistrationForm(FlaskForm):
    """Customer registration form."""
    first_name = StringField(
        'Fornavn',
        validators=[DataRequired(message='Fornavn er påkrævet'), Length(min=2, max=100)]
    )
    last_name = StringField(
        'Efternavn',
        validators=[DataRequired(message='Efternavn er påkrævet'), Length(min=2, max=100)]
    )
    email = StringField(
        'E-mail',
        validators=[DataRequired(message='E-mail er påkrævet'), Email(message='Ugyldig e-mail adresse'), Length(max=120)]
    )
    phone = StringField(
        'Telefon',
        validators=[Optional(), Length(max=20)]
    )
    password = PasswordField(
        'Adgangskode',
        validators=[DataRequired(message='Adgangskode er påkrævet'), Length(min=6, message='Adgangskode skal være mindst 6 karakterer')]
    )
    confirm_password = PasswordField(
        'Bekræft adgangskode',
        validators=[DataRequired(message='Bekræft adgangskode er påkrævet'), EqualTo('password', message='Adgangskoderne matcher ikke')]
    )
    address = StringField(
        'Adresse',
        validators=[Optional(), Length(max=300)]
    )
    zip_code = StringField(
        'Postnummer',
        validators=[Optional(), Length(max=10)]
    )
    city = StringField(
        'By',
        validators=[Optional(), Length(max=100)]
    )
    accept_terms = BooleanField(
        'Jeg accepterer vilkår og betingelser',
        validators=[DataRequired(message='Du skal acceptere vilkår og betingelser')]
    )


class ProfileCompletionForm(FlaskForm):
    """Profile completion form for guest customers."""
    password = PasswordField(
        'Adgangskode',
        validators=[DataRequired(message='Adgangskode er påkrævet'), Length(min=8, message='Adgangskode skal være mindst 8 karakterer')]
    )
    confirm_password = PasswordField(
        'Bekræft adgangskode',
        validators=[DataRequired(message='Bekræft adgangskode er påkrævet'), EqualTo('password', message='Adgangskoderne matcher ikke')]
    )
    accept_terms = BooleanField(
        'Jeg accepterer vilkår og betingelser',
        validators=[DataRequired(message='Du skal acceptere vilkår og betingelser')]
    )


class ProductImageForm(FlaskForm):
    """Product image form for admin."""
    url = StringField(
        'Billede URL',
        validators=[Optional(), Length(max=500)]
    )
    alt = StringField(
        'Alt tekst',
        validators=[DataRequired(message='Alt tekst er påkrævet'), Length(max=200)]
    )
    sort_order = IntegerField(
        'Sorteringsrækkefølge',
        validators=[DataRequired(message='Sorteringsrækkefølge er påkrævet'), NumberRange(min=1, message='Sorteringsrækkefølge skal være mindst 1')],
        default=1
    )
    image_file = FileField(
        'Upload billede',
        validators=[
            Optional(),
            FileAllowed(['jpg', 'jpeg', 'png', 'gif', 'webp'], 'Kun billedfiler er tilladt (JPG, PNG, GIF, WebP)')
        ]
    )


class BulkImageUploadForm(FlaskForm):
    """Bulk image upload form for products."""
    image_files = FileField(
        'Upload billeder',
        validators=[
            Optional(),
            FileAllowed(['jpg', 'jpeg', 'png', 'gif', 'webp'], 'Kun billedfiler er tilladt (JPG, PNG, GIF, WebP)')
        ],
        render_kw={'multiple': True}
    )
    alt_prefix = StringField(
        'Alt tekst præfiks',
        validators=[Optional(), Length(max=100)],
        default='Produktbillede'
    )


class CustomerLoginForm(FlaskForm):
    """Customer login form."""
    email = StringField(
        'E-mail',
        validators=[DataRequired(message='E-mail er påkrævet'), Email(message='Ugyldig e-mail adresse')]
    )
    password = PasswordField(
        'Adgangskode',
        validators=[DataRequired(message='Adgangskode er påkrævet')]
    )
    remember_me = BooleanField('Husk mig')
