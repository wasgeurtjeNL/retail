import { supabase } from './supabase';

// Define the email template interface
export interface EmailTemplate {
  name: string;
  description: string;
  subject: string;
  html: string;
  text: string;
}

// Define valid template keys
export type TemplateKey = 
  | 'retailer-registration-confirmation' 
  | 'retailer-approval' 
  | 'retailer-rejection' 
  | 'order-confirmation' 
  | 'admin-notification'
  | 'retailer-order-confirmation'
  | 'retailer-training-materials'
  | 'retailer-directory-listing'
  | 'retailer-removal'
  | 'wasstrips-deposit-payment'
  | 'wasstrips-deposit-paid'
  | 'wasstrips-order-ready'
  | 'wasstrips-shipped'
  | 'wasstrips-remaining-payment';

// Define the templates record type
export type TemplatesRecord = Record<TemplateKey, EmailTemplate>;

// Standaard e-mail templates voor het Wasgeurtje retailer platform
export const defaultTemplates: TemplatesRecord = {
  // Retailer registratie templates
  'retailer-registration-confirmation': {
    name: 'Registratie bevestiging',
    description: 'E-mail verzonden naar retailers na registratie',
    subject: 'Bedankt voor uw aanmelding bij Wasgeurtje',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #e91e63;">
          <h1 style="color: #e91e63; margin-top: 0;">Bedankt voor uw aanmelding</h1>
          <p>Beste {{contactName}},</p>
          <p>Bedankt voor uw interesse in het worden van een Wasgeurtje retailer.</p>
          <p>We hebben uw aanvraag ontvangen en zullen deze zo snel mogelijk beoordelen. We streven ernaar om binnen 48 uur te reageren.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #e91e63;">Uw aanvraag - Stap 1 van 5</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Aanvraag ingediend</strong> <span style="color: #4caf50;">✓</span></li>
              <li>Verificatie (binnen 48 uur)</li>
              <li>Initiële bestelling plaatsen</li>
              <li>Trainingsmateriaal ontvangen</li>
              <li>Officiële vermelding in retailer directory</li>
            </ol>
          </div>
          
          <p>Uw aanvraag bevat de volgende gegevens:</p>
          <ul style="margin-bottom: 20px;">
            <li><strong>Bedrijfsnaam:</strong> {{businessName}}</li>
            <li><strong>E-mail:</strong> {{email}}</li>
            <li><strong>Telefoon:</strong> {{phone}}</li>
          </ul>
          
          <div style="background-color: #fff6f9; border: 1px dashed #e91e63; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #e91e63;">Wat kunt u verwachten?</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Na goedkeuring ontvangt u een <strong>gratis proefpakket</strong> t.w.v. €14,95</li>
              <li>Minimale eerste bestelling: <strong>€150</strong> (excl. BTW)</li>
              <li>Minimale nabestellingen: <strong>€75</strong></li>
              <li>Gratis verzending vanaf €200</li>
              <li>Exclusiviteitsbeleid: maximaal één retailer per stad/wijk</li>
            </ul>
          </div>
          
          <p>Als u nog vragen heeft, kunt u altijd contact met ons opnemen via <a href="mailto:info@wasgeurtje.nl" style="color: #e91e63;">info@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Bedankt voor uw aanmelding

Beste {{contactName}},

Bedankt voor uw interesse in het worden van een Wasgeurtje retailer.

We hebben uw aanvraag ontvangen en zullen deze zo snel mogelijk beoordelen. We streven ernaar om binnen 48 uur te reageren.

UW AANVRAAG - STAP 1 VAN 5
1. Aanvraag ingediend ✓
2. Verificatie (binnen 48 uur)
3. Initiële bestelling plaatsen
4. Trainingsmateriaal ontvangen
5. Officiële vermelding in retailer directory

Uw aanvraag bevat de volgende gegevens:
- Bedrijfsnaam: {{businessName}}
- E-mail: {{email}}
- Telefoon: {{phone}}

WAT KUNT U VERWACHTEN?
- Na goedkeuring ontvangt u een gratis proefpakket t.w.v. €14,95
- Minimale eerste bestelling: €150 (excl. BTW)
- Minimale nabestellingen: €75
- Gratis verzending vanaf €200
- Exclusiviteitsbeleid: maximaal één retailer per stad/wijk

Als u nog vragen heeft, kunt u altijd contact met ons opnemen via info@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'retailer-approval': {
    name: 'Retailer goedkeuring',
    description: 'E-mail verzonden naar retailers na goedkeuring',
    subject: 'Uw Wasgeurtje retailer aanvraag is goedgekeurd!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #4caf50;">
          <h1 style="color: #4caf50; margin-top: 0;">Goed nieuws!</h1>
          <p>Beste {{contactName}},</p>
          <p>Uw aanvraag om Wasgeurtje retailer te worden is <strong>goedgekeurd</strong>.</p>
          <p>We zijn verheugd om u te verwelkomen als officiële Wasgeurtje retailer! U krijgt toegang tot onze premium wasgeuren en kunt nu profiteren van onze speciale B2B-prijzen.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #4caf50;">Uw aanvraag - Stap 2 van 5 voltooid</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Aanvraag ingediend</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Verificatie voltooid</strong> <span style="color: #4caf50;">✓</span></li>
              <li>Initiële bestelling plaatsen <span style="color: #e91e63; font-weight: bold;">Nu actief</span></li>
              <li>Trainingsmateriaal ontvangen</li>
              <li>Officiële vermelding in retailer directory</li>
            </ol>
          </div>
          
          <div style="background-color: #4caf50; color: white; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h2 style="margin-top: 0; font-size: 18px;">Wat zijn de volgende stappen?</h2>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li>We sturen een <strong>gratis proefpakket</strong> (t.w.v. €14,95) naar uw adres</li>
              <li>Activeer uw account via de knop hieronder</li>
              <li>Plaats uw eerste bestelling (minimaal €150 excl. BTW)</li>
              <li>Ontvang uw trainingsmateriaal en productinformatie</li>
            </ol>
          </div>
          
          <div style="margin: 25px 0; border: 1px solid #ddd; border-radius: 4px; padding: 15px; background-color: #f8f8f8;">
            <h3 style="margin-top: 0; font-size: 16px; color: #333;">Belangrijke informatie voor retailers</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Minimale bestelwaarde:</strong> €150 voor eerste bestelling, €75 voor nabestellingen</li>
              <li><strong>Gratis verzending:</strong> Bij bestellingen boven €200</li>
              <li><strong>Exclusiviteit:</strong> Één Wasgeurtje retailer per stad/district</li>
              <li><strong>Prijsbeleid:</strong> Adviesverkoopprijs hanteren (max. 5% korting toegestaan)</li>
              <li><strong>Verkooprestricties:</strong> Geen verkoop op marktplaatsen zoals Bol.com of Amazon</li>
              <li><strong>Uitstalling:</strong> Producten moeten prominent in de winkel worden getoond</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{activationUrl}}" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Account activeren</a>
          </div>
          <p>Heeft u vragen? Neem dan gerust contact met ons op via <a href="mailto:retailer@wasgeurtje.nl" style="color: #e91e63;">retailer@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Goed nieuws!

Beste {{contactName}},

Uw aanvraag om Wasgeurtje retailer te worden is GOEDGEKEURD.

We zijn verheugd om u te verwelkomen als officiële Wasgeurtje retailer! U krijgt toegang tot onze premium wasgeuren en kunt nu profiteren van onze speciale B2B-prijzen.

UW AANVRAAG - STAP 2 VAN 5 VOLTOOID
1. Aanvraag ingediend ✓
2. Verificatie voltooid ✓
3. Initiële bestelling plaatsen (Nu actief)
4. Trainingsmateriaal ontvangen
5. Officiële vermelding in retailer directory

WAT ZIJN DE VOLGENDE STAPPEN?
1. We sturen een gratis proefpakket (t.w.v. €14,95) naar uw adres
2. Activeer uw account via deze link: {{activationUrl}}
3. Plaats uw eerste bestelling (minimaal €150 excl. BTW)
4. Ontvang uw trainingsmateriaal en productinformatie

BELANGRIJKE INFORMATIE VOOR RETAILERS
- Minimale bestelwaarde: €150 voor eerste bestelling, €75 voor nabestellingen
- Gratis verzending: Bij bestellingen boven €200
- Exclusiviteit: Één Wasgeurtje retailer per stad/district
- Prijsbeleid: Adviesverkoopprijs hanteren (max. 5% korting toegestaan)
- Verkooprestricties: Geen verkoop op marktplaatsen zoals Bol.com of Amazon
- Uitstalling: Producten moeten prominent in de winkel worden getoond

Heeft u vragen? Neem dan gerust contact met ons op via retailer@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'retailer-rejection': {
    name: 'Retailer afwijzing',
    description: 'E-mail verzonden naar retailers na afwijzing',
    subject: 'Update over uw Wasgeurtje retailer aanvraag',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #9e9e9e;">
          <h1 style="color: #333; margin-top: 0;">Update over uw aanvraag</h1>
          <p>Beste {{contactName}},</p>
          <p>Bedankt voor uw interesse in het worden van een Wasgeurtje retailer.</p>
          <p>Na zorgvuldige overweging kunnen we helaas niet doorgaan met uw aanvraag op dit moment.</p>
          
          {{#if rejectionReason}}
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reden:</strong> {{rejectionReason}}</p>
          </div>
          {{/if}}
          
          <div style="background-color: #f0f0f0; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #666;">Veelvoorkomende redenen voor afwijzing</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Er is al een Wasgeurtje retailer in uw stad/wijk (exclusiviteitsbeleid)</li>
              <li>Uw winkel past niet bij het premium karakter van onze producten</li>
              <li>De minimale orderwaarde kan niet worden gegarandeerd</li>
              <li>De geografische spreiding voldoet niet aan onze huidige strategie</li>
            </ul>
          </div>
          
          <p>We moedigen u aan om in de toekomst nogmaals een aanvraag in te dienen als uw omstandigheden veranderen. Onze retailstrategie wordt regelmatig herzien, en er kunnen zich nieuwe mogelijkheden voordoen.</p>
          
          <p>Als u vragen heeft of meer informatie wenst, aarzel dan niet om contact met ons op te nemen via <a href="mailto:info@wasgeurtje.nl" style="color: #e91e63;">info@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Update over uw aanvraag

Beste {{contactName}},

Bedankt voor uw interesse in het worden van een Wasgeurtje retailer.

Na zorgvuldige overweging kunnen we helaas niet doorgaan met uw aanvraag op dit moment.

{{#if rejectionReason}}
Reden: {{rejectionReason}}
{{/if}}

VEELVOORKOMENDE REDENEN VOOR AFWIJZING:
- Er is al een Wasgeurtje retailer in uw stad/wijk (exclusiviteitsbeleid)
- Uw winkel past niet bij het premium karakter van onze producten
- De minimale orderwaarde kan niet worden gegarandeerd
- De geografische spreiding voldoet niet aan onze huidige strategie

We moedigen u aan om in de toekomst nogmaals een aanvraag in te dienen als uw omstandigheden veranderen. Onze retailstrategie wordt regelmatig herzien, en er kunnen zich nieuwe mogelijkheden voordoen.

Als u vragen heeft of meer informatie wenst, aarzel dan niet om contact met ons op te nemen via info@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  // Order gerelateerde templates
  'order-confirmation': {
    name: 'Orderbevestiging',
    description: 'E-mail verzonden na bestelling',
    subject: 'Bevestiging van uw bestelling #{{orderNumber}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #2196f3;">
          <h1 style="color: #2196f3; margin-top: 0;">Uw bestelling is bevestigd</h1>
          <p>Beste {{contactName}},</p>
          <p>Bedankt voor uw bestelling! We hebben uw bestelling ontvangen en zullen deze zo snel mogelijk verwerken.</p>
          
          <div style="margin: 25px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 15px 0;">
            <h2 style="font-size: 16px; margin-top: 0;">Bestelling #{{orderNumber}}</h2>
            <p><strong>Datum:</strong> {{orderDate}}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                  <th style="text-align: left; padding: 8px 0;">Product</th>
                  <th style="text-align: center; padding: 8px 0;">Aantal</th>
                  <th style="text-align: right; padding: 8px 0;">Prijs</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px 0;">{{name}}</td>
                  <td style="text-align: center; padding: 12px 0;">{{quantity}}</td>
                  <td style="text-align: right; padding: 12px 0;">€{{price}}</td>
                </tr>
                {{/each}}
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0;"><strong>Subtotaal:</strong></td>
                  <td style="text-align: right; padding: 12px 0;">€{{subtotal}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0;"><strong>BTW:</strong></td>
                  <td style="text-align: right; padding: 12px 0;">€{{tax}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0;"><strong>Verzendkosten:</strong></td>
                  <td style="text-align: right; padding: 12px 0;">€{{shipping}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0; font-weight: bold; font-size: 16px;">Totaal:</td>
                  <td style="text-align: right; padding: 12px 0; font-weight: bold; font-size: 16px;">€{{total}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p>We zullen uw bestelling verzenden naar:</p>
          <p style="margin-left: 15px;">
            {{businessName}}<br />
            t.a.v. {{contactName}}<br />
            {{address}}<br />
            {{postalCode}} {{city}}<br />
            {{country}}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{orderDetailsUrl}}" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Bekijk bestelling</a>
          </div>
          
          <p>Heeft u vragen over uw bestelling? Neem dan contact op via <a href="mailto:orders@wasgeurtje.nl" style="color: #e91e63;">orders@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Uw bestelling is bevestigd

Beste {{contactName}},

Bedankt voor uw bestelling! We hebben uw bestelling ontvangen en zullen deze zo snel mogelijk verwerken.

Bestelling #{{orderNumber}}
Datum: {{orderDate}}

{{#each items}}
- {{name}} ({{quantity}}x): €{{price}}
{{/each}}

Subtotaal: €{{subtotal}}
BTW: €{{tax}}
Verzendkosten: €{{shipping}}
Totaal: €{{total}}

We zullen uw bestelling verzenden naar:
{{businessName}}
t.a.v. {{contactName}}
{{address}}
{{postalCode}} {{city}}
{{country}}

Bekijk uw bestelling online: {{orderDetailsUrl}}

Heeft u vragen over uw bestelling? Neem dan contact op via orders@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'admin-notification': {
    name: 'Admin notificatie',
    description: 'E-mail verzonden naar admins bij belangrijke gebeurtenissen',
    subject: '[Admin] {{notificationType}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #ff9800;">
          <h1 style="color: #ff9800; margin-top: 0;">[Admin] {{notificationType}}</h1>
          <p>Er is een nieuwe {{notificationType}} op het Wasgeurtje retailer platform op {{date}}.</p>
          
          <h2 style="margin-top: 20px; font-size: 16px;">Details:</h2>
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 10px 0;">
            {{#each details}}
            <p><strong>{{@key}}:</strong> {{this}}</p>
            {{/each}}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{actionUrl}}" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Naar dashboard</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
[Admin] {{notificationType}}

Er is een nieuwe {{notificationType}} op het Wasgeurtje retailer platform op {{date}}.

Details:
{{#each details}}
- {{@key}}: {{this}}
{{/each}}

Ga naar het dashboard om actie te ondernemen: {{actionUrl}}

© {{currentYear}} Wasgeurtje.nl
    `
  },
  // Add new templates for steps 3 and 4 of the onboarding process
  'retailer-order-confirmation': {
    name: 'Retailer bestelling bevestiging',
    description: 'E-mail verzonden naar retailers na eerste bestelling',
    subject: 'Uw bestelling is bevestigd - Stap 3 voltooid',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #2196f3;">
          <h1 style="color: #2196f3; margin-top: 0;">Uw bestelling is bevestigd</h1>
          <p>Beste {{contactName}},</p>
          <p>Bedankt voor uw bestelling! We hebben uw bestelling #{{orderNumber}} ontvangen en zullen deze zo snel mogelijk verwerken.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #2196f3;">Uw retailer traject - Stap 3 van 5 voltooid</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Aanvraag ingediend</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Verificatie voltooid</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Initiële bestelling geplaatst</strong> <span style="color: #4caf50;">✓</span></li>
              <li>Trainingsmateriaal ontvangen <span style="color: #e91e63; font-weight: bold;">Volgende stap</span></li>
              <li>Officiële vermelding in retailer directory</li>
            </ol>
          </div>
          
          <div style="margin: 25px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 15px 0;">
            <h2 style="font-size: 16px; margin-top: 0;">Bestelling #{{orderNumber}}</h2>
            <p><strong>Datum:</strong> {{orderDate}}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                  <th style="text-align: left; padding: 8px 0;">Product</th>
                  <th style="text-align: center; padding: 8px 0;">Aantal</th>
                  <th style="text-align: right; padding: 8px 0;">Prijs</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px 0;">{{name}}</td>
                  <td style="text-align: center; padding: 12px 0;">{{quantity}}</td>
                  <td style="text-align: right; padding: 12px 0;">€{{price}}</td>
                </tr>
                {{/each}}
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0;"><strong>Subtotaal:</strong></td>
                  <td style="text-align: right; padding: 12px 0;">€{{subtotal}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0;"><strong>BTW:</strong></td>
                  <td style="text-align: right; padding: 12px 0;">€{{tax}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0;"><strong>Verzendkosten:</strong></td>
                  <td style="text-align: right; padding: 12px 0;">€{{shipping}}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 12px 0; font-weight: bold; font-size: 16px;">Totaal:</td>
                  <td style="text-align: right; padding: 12px 0; font-weight: bold; font-size: 16px;">€{{total}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="background-color: #e5f2ff; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #2196f3;">Wat gebeurt er nu?</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li>Uw bestelling wordt binnen 1-2 werkdagen verzonden</li>
              <li>U ontvangt een track & trace code zodra uw bestelling is verzonden</li>
              <li>Binnen 48 uur ontvangt u uw trainingsmateriaal per e-mail</li>
              <li>Uw bedrijf wordt toegevoegd aan onze officiële retailer directory</li>
            </ol>
          </div>
          
          <p>We zullen uw bestelling verzenden naar:</p>
          <p style="margin-left: 15px;">
            {{businessName}}<br />
            t.a.v. {{contactName}}<br />
            {{address}}<br />
            {{postalCode}} {{city}}<br />
            {{country}}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{orderDetailsUrl}}" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Bekijk bestelling</a>
          </div>
          
          <p>Heeft u vragen over uw bestelling? Neem dan contact op via <a href="mailto:orders@wasgeurtje.nl" style="color: #e91e63;">orders@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Uw bestelling is bevestigd

Beste {{contactName}},

Bedankt voor uw bestelling! We hebben uw bestelling #{{orderNumber}} ontvangen en zullen deze zo snel mogelijk verwerken.

UW RETAILER TRAJECT - STAP 3 VAN 5 VOLTOOID
1. Aanvraag ingediend ✓
2. Verificatie voltooid ✓
3. Initiële bestelling geplaatst ✓
4. Trainingsmateriaal ontvangen (Volgende stap)
5. Officiële vermelding in retailer directory

Bestelling #{{orderNumber}}
Datum: {{orderDate}}

{{#each items}}
- {{name}} ({{quantity}}x): €{{price}}
{{/each}}

Subtotaal: €{{subtotal}}
BTW: €{{tax}}
Verzendkosten: €{{shipping}}
Totaal: €{{total}}

WAT GEBEURT ER NU?
1. Uw bestelling wordt binnen 1-2 werkdagen verzonden
2. U ontvangt een track & trace code zodra uw bestelling is verzonden
3. Binnen 48 uur ontvangt u uw trainingsmateriaal per e-mail
4. Uw bedrijf wordt toegevoegd aan onze officiële retailer directory

We zullen uw bestelling verzenden naar:
{{businessName}}
t.a.v. {{contactName}}
{{address}}
{{postalCode}} {{city}}
{{country}}

Bekijk uw bestelling online: {{orderDetailsUrl}}

Heeft u vragen over uw bestelling? Neem dan contact op via orders@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'retailer-training-materials': {
    name: 'Retailer trainingsmateriaal',
    description: 'E-mail met trainingsmateriaal voor nieuwe retailers',
    subject: 'Uw Wasgeurtje trainingsmateriaal - Stap 4 voltooid',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #9c27b0;">
          <h1 style="color: #9c27b0; margin-top: 0;">Uw trainingsmateriaal is gereed</h1>
          <p>Beste {{contactName}},</p>
          <p>Gefeliciteerd met uw officiële status als Wasgeurtje retailer! Zoals beloofd sturen we u hierbij het trainingsmateriaal dat u zal helpen om onze producten succesvol te verkopen.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #9c27b0;">Uw retailer traject - Stap 4 van 5 voltooid</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Aanvraag ingediend</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Verificatie voltooid</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Initiële bestelling geplaatst</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Trainingsmateriaal ontvangen</strong> <span style="color: #4caf50;">✓</span></li>
              <li>Officiële vermelding in retailer directory <span style="color: #e91e63; font-weight: bold;">In behandeling</span></li>
            </ol>
          </div>
          
          <div style="background-color: #f5f0f7; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #9c27b0;">Inbegrepen trainingsmaterialen</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Productbrochure</strong> - Gedetailleerde informatie over alle Wasgeurtje producten</li>
              <li><strong>Verkoopgids</strong> - Tips en strategieën om de producten te promoten</li>
              <li><strong>Displayinstructies</strong> - Hoe u onze producten het beste kunt presenteren</li>
              <li><strong>Productmonsters</strong> - Instructies voor het gebruik van de monsters in uw proefpakket</li>
              <li><strong>Veelgestelde vragen</strong> - Antwoorden op vragen die klanten vaak stellen</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{trainingUrl}}" style="background-color: #9c27b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Download trainingsmateriaal</a>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #333;">Belangrijke deadlines</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Uw bedrijf wordt binnen 7 dagen toegevoegd aan onze retailer directory</li>
              <li>De volgende besteldeadline voor nabestellingen: <strong>{{nextOrderDeadline}}</strong></li>
              <li>Vraag marketing promotiemateriaal aan vóór: <strong>{{promotionDeadline}}</strong></li>
            </ul>
          </div>
          
          <p>We kijken uit naar een succesvolle samenwerking. Mocht u vragen hebben over het trainingsmateriaal, neem dan contact op via <a href="mailto:support@wasgeurtje.nl" style="color: #9c27b0;">support@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Uw trainingsmateriaal is gereed

Beste {{contactName}},

Gefeliciteerd met uw officiële status als Wasgeurtje retailer! Zoals beloofd sturen we u hierbij het trainingsmateriaal dat u zal helpen om onze producten succesvol te verkopen.

UW RETAILER TRAJECT - STAP 4 VAN 5 VOLTOOID
1. Aanvraag ingediend ✓
2. Verificatie voltooid ✓
3. Initiële bestelling geplaatst ✓
4. Trainingsmateriaal ontvangen ✓
5. Officiële vermelding in retailer directory (In behandeling)

INBEGREPEN TRAININGSMATERIALEN
- Productbrochure - Gedetailleerde informatie over alle Wasgeurtje producten
- Verkoopgids - Tips en strategieën om de producten te promoten
- Displayinstructies - Hoe u onze producten het beste kunt presenteren
- Productmonsters - Instructies voor het gebruik van de monsters in uw proefpakket
- Veelgestelde vragen - Antwoorden op vragen die klanten vaak stellen

Download uw trainingsmateriaal hier: {{trainingUrl}}

BELANGRIJKE DEADLINES
- Uw bedrijf wordt binnen 7 dagen toegevoegd aan onze retailer directory
- De volgende besteldeadline voor nabestellingen: {{nextOrderDeadline}}
- Vraag marketing promotiemateriaal aan vóór: {{promotionDeadline}}

We kijken uit naar een succesvolle samenwerking. Mocht u vragen hebben over het trainingsmateriaal, neem dan contact op via support@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'retailer-directory-listing': {
    name: 'Retailer directory vermelding',
    description: 'E-mail ter bevestiging van opname in de retailer directory',
    subject: 'Uw winkel is toegevoegd aan de Wasgeurtje directory!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #ff5722;">
          <h1 style="color: #ff5722; margin-top: 0;">Gefeliciteerd! Uw winkel staat nu in onze directory</h1>
          <p>Beste {{contactName}},</p>
          <p>We zijn verheugd om u te laten weten dat <strong>{{businessName}}</strong> nu officieel is toegevoegd aan onze retailer directory! Klanten in uw omgeving kunnen uw winkel nu vinden via onze interactieve kaart en retailer zoekfunctie op wasgeurtje.nl.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #ff5722;">Uw retailer traject - Volledig voltooid</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Aanvraag ingediend</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Verificatie voltooid</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Initiële bestelling geplaatst</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Trainingsmateriaal ontvangen</strong> <span style="color: #4caf50;">✓</span></li>
              <li><strong>Officiële vermelding in retailer directory</strong> <span style="color: #4caf50;">✓</span></li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="{{mapPreviewUrl}}" alt="Kaart met uw winkellocatie" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" />
          </div>
          
          <div style="background-color: #fff6f2; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #ff5722;">Uw zichtbaarheid vergroten</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Vermeld op uw eigen website dat u een officiële Wasgeurtje retailer bent</li>
              <li>Post op sociale media over uw nieuwe Wasgeurtje producten</li>
              <li>Gebruik de meegeleverde promotiematerialen in uw winkel</li>
              <li>Vraag naar onze seizoensgebonden promotiekits</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{directoryUrl}}" style="background-color: #ff5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Bekijk uw vermelding</a>
          </div>
          
          <p>Heeft u vragen of wilt u wijzigingen aanbrengen in uw vermelding? Neem dan contact op via <a href="mailto:directory@wasgeurtje.nl" style="color: #ff5722;">directory@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Gefeliciteerd! Uw winkel staat nu in onze directory

Beste {{contactName}},

We zijn verheugd om u te laten weten dat {{businessName}} nu officieel is toegevoegd aan onze retailer directory! Klanten in uw omgeving kunnen uw winkel nu vinden via onze interactieve kaart en retailer zoekfunctie op wasgeurtje.nl.

UW RETAILER TRAJECT - VOLLEDIG VOLTOOID
1. Aanvraag ingediend ✓
2. Verificatie voltooid ✓
3. Initiële bestelling geplaatst ✓
4. Trainingsmateriaal ontvangen ✓
5. Officiële vermelding in retailer directory ✓

UW ZICHTBAARHEID VERGROTEN
- Vermeld op uw eigen website dat u een officiële Wasgeurtje retailer bent
- Post op sociale media over uw nieuwe Wasgeurtje producten
- Gebruik de meegeleverde promotiematerialen in uw winkel
- Vraag naar onze seizoensgebonden promotiekits

Bekijk uw vermelding hier: {{directoryUrl}}

Heeft u vragen of wilt u wijzigingen aanbrengen in uw vermelding? Neem dan contact op via directory@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  // --- Professioneel template voor accountbeëindiging ---
  'retailer-removal': {
    name: 'Retailer account beëindiging',
    description: 'E-mail naar retailer bij verwijdering van het account',
    subject: 'Uw Wasgeurtje retailer account is beëindigd',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #fff6f6; border-radius: 8px; padding: 20px; border-left: 4px solid #e91e63;">
          <h1 style="color: #e91e63; margin-top: 0;">Account beëindigd</h1>
          <p>Beste {{contactName}},</p>
          <p>Uw Wasgeurtje retailer account is per direct beëindigd door de administrator.</p>
          <p>Reden: <strong>{{reason}}</strong></p>
          <p>Mocht u vragen hebben over deze beslissing, neem dan gerust contact op via <a href="mailto:info@wasgeurtje.nl" style="color: #e91e63;">info@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Account beëindigd

Beste {{contactName}},

Uw Wasgeurtje retailer account is per direct beëindigd door de administrator.

Reden: {{reason}}

Mocht u vragen hebben over deze beslissing, neem dan gerust contact op via info@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'wasstrips-deposit-payment': {
    name: 'Wasstrips Aanbetaling',
    description: 'E-mail voor aanbetaling van Wasstrips na retailer goedkeuring',
    subject: 'Aanbetaling voor uw Wasstrips bestelling - €30',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #e91e63;">
          <h1 style="color: #e91e63; margin-top: 0;">Aanbetaling voor Wasstrips</h1>
          <p>Beste {{contactName}},</p>
          <p>Gefeliciteerd! Uw retailer aanvraag is goedgekeurd en u kunt nu Wasstrips gaan verkopen.</p>
          <p>Om uw Wasstrips bestelling te starten, vragen wij een <strong>aanbetaling van €30</strong> (10% van de minimum bestelling van €300).</p>
          
          <div style="background-color: #e91e63; color: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Aanbetaling: €30,00</h2>
            <p style="margin: 10px 0; font-size: 16px;">Deze wordt volledig verrekend met uw eerste bestelling</p>
            <div style="margin: 20px 0;">
              <a href="{{paymentUrl}}" style="background-color: white; color: #e91e63; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Betaal nu €30</a>
            </div>
          </div>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #e91e63;">Wat gebeurt er na betaling?</h3>
            <ol style="margin-bottom: 0; padding-left: 20px;">
              <li>Uw aanbetaling van €30 wordt bevestigd</li>
              <li>Wij bereiden uw Wasstrips bestelling voor</li>
              <li>U ontvangt uw producten binnen 2-3 werkdagen</li>
              <li>Na ontvangst betaalt u het restbedrag van €270</li>
              <li>De €30 aanbetaling wordt volledig verrekend</li>
            </ol>
          </div>
          
          <div style="background-color: #fff6f9; border: 1px dashed #e91e63; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #e91e63;">Betaalopties</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Online betaling:</strong> Direct via iDEAL, creditcard of bancontact</li>
              <li><strong>Factuur:</strong> Betaling binnen 14 dagen na ontvangst factuur</li>
            </ul>
          </div>
          
          <p>Heeft u vragen over de aanbetaling of het bestelproces? Neem gerust contact met ons op via <a href="mailto:orders@wasgeurtje.nl" style="color: #e91e63;">orders@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Aanbetaling voor Wasstrips

Beste {{contactName}},

Gefeliciteerd! Uw retailer aanvraag is goedgekeurd en u kunt nu Wasstrips gaan verkopen.

Om uw Wasstrips bestelling te starten, vragen wij een aanbetaling van €30 (10% van de minimum bestelling van €300).

AANBETALING: €30,00
Deze wordt volledig verrekend met uw eerste bestelling

Betaal nu: {{paymentUrl}}

WAT GEBEURT ER NA BETALING?
1. Uw aanbetaling van €30 wordt bevestigd
2. Wij bereiden uw Wasstrips bestelling voor
3. U ontvangt uw producten binnen 2-3 werkdagen
4. Na ontvangst betaalt u het restbedrag van €270
5. De €30 aanbetaling wordt volledig verrekend

BETAALOPTIES
- Online betaling: Direct via iDEAL, creditcard of bancontact
- Factuur: Betaling binnen 14 dagen na ontvangst factuur

Heeft u vragen over de aanbetaling of het bestelproces? Neem gerust contact met ons op via orders@wasgeurtje.nl.

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'wasstrips-remaining-payment': {
    name: 'Wasstrips Restbedrag',
    description: 'E-mail voor restbedrag betaling na levering van Wasstrips',
    subject: 'Restbedrag voor uw Wasstrips bestelling - €270',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #4caf50;">
          <h1 style="color: #4caf50; margin-top: 0;">Uw Wasstrips zijn geleverd!</h1>
          <p>Beste {{contactName}},</p>
          <p>Geweldig nieuws! Uw Wasstrips bestelling is succesvol geleverd en u kunt nu beginnen met verkopen.</p>
          <p>Het restbedrag van <strong>€270</strong> kan nu worden betaald. Uw eerdere aanbetaling van €30 is reeds verrekend.</p>
          
          <div style="background-color: #4caf50; color: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Restbedrag: €270,00</h2>
            <p style="margin: 10px 0; font-size: 16px;">Aanbetaling van €30 reeds verrekend</p>
            <div style="margin: 20px 0;">
              <a href="{{paymentUrl}}" style="background-color: white; color: #4caf50; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Betaal restbedrag</a>
            </div>
          </div>
          
          <div style="background-color: #f5f5f5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #4caf50;">Bestelling overzicht</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Totaal bestelling:</strong> €300,00</li>
              <li><strong>Aanbetaling betaald:</strong> -€30,00</li>
              <li><strong>Restbedrag:</strong> €270,00</li>
            </ul>
          </div>
          
          <div style="background-color: #e8f5e8; border: 1px dashed #4caf50; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #4caf50;">Betaalopties restbedrag</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Online betaling:</strong> Direct via iDEAL, creditcard of bancontact</li>
              <li><strong>Factuur:</strong> Betaling binnen 14 dagen na ontvangst factuur</li>
              <li><strong>Bankoverschrijving:</strong> Op rekening NL91 ABNA 0417 1643 00</li>
            </ul>
          </div>
          
          <div style="background-color: #fff9c4; border: 1px solid #f57f17; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #f57f17;">💡 Tips voor succesvol verkopen</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li>Plaats de Wasstrips prominent in uw winkel</li>
              <li>Gebruik de meegeleverde display materialen</li>
              <li>Deel uw ervaringen op social media</li>
              <li>Volgende bestelling? Minimum €75 voor nabestellingen</li>
            </ul>
          </div>
          
          <p>Heeft u vragen over de betaling of het verkopen van Wasstrips? Neem gerust contact met ons op via <a href="mailto:support@wasgeurtje.nl" style="color: #4caf50;">support@wasgeurtje.nl</a>.</p>
          <p style="margin-bottom: 0;">Veel succes met de verkoop!<br />Het Wasgeurtje Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>&copy; {{currentYear}} Wasgeurtje.nl | <a href="https://wasgeurtje.nl/privacy" style="color: #888;">Privacy</a> | <a href="https://wasgeurtje.nl/voorwaarden" style="color: #888;">Voorwaarden</a></p>
        </div>
      </div>
    `,
    text: `
Uw Wasstrips zijn geleverd!

Beste {{contactName}},

Geweldig nieuws! Uw Wasstrips bestelling is succesvol geleverd en u kunt nu beginnen met verkopen.

Het restbedrag van €270 kan nu worden betaald. Uw eerdere aanbetaling van €30 is reeds verrekend.

RESTBEDRAG: €270,00
Aanbetaling van €30 reeds verrekend

Betaal restbedrag: {{paymentUrl}}

BESTELLING OVERZICHT
- Totaal bestelling: €300,00
- Aanbetaling betaald: -€30,00
- Restbedrag: €270,00

BETAALOPTIES RESTBEDRAG
- Online betaling: Direct via iDEAL, creditcard of bancontact
- Factuur: Betaling binnen 14 dagen na ontvangst factuur
- Bankoverschrijving: Op rekening NL91 ABNA 0417 1643 00

TIPS VOOR SUCCESVOL VERKOPEN
- Plaats de Wasstrips prominent in uw winkel
- Gebruik de meegeleverde display materialen
- Deel uw ervaringen op social media
- Volgende bestelling? Minimum €75 voor nabestellingen

Heeft u vragen over de betaling of het verkopen van Wasstrips? Neem gerust contact met ons op via support@wasgeurtje.nl.

Veel succes met de verkoop!
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },
  'wasstrips-deposit-paid': {
    name: 'Wasstrips Aanbetaling Bevestiging',
    description: 'Bevestigingsmail na succesvolle aanbetaling voor Wasstrips',
    subject: 'Uw aanbetaling van €30 is ontvangen - Wasstrips bestelling',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; border-left: 4px solid #28a745;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #28a745; margin: 0; font-size: 28px;">✅ Aanbetaling Ontvangen!</h1>
          </div>
          
          <p>Beste {{retailer_name}},</p>
          
          <p><strong>Geweldig nieuws!</strong> Uw aanbetaling van <strong>€30,00</strong> voor uw Wasstrips bestelling is succesvol ontvangen.</p>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0; font-size: 18px;">📋 Betalingsdetails:</h3>
            <div style="background-color: white; border-radius: 6px; padding: 15px;">
              <ul style="margin: 0; padding-left: 20px; list-style: none;">
                <li style="margin-bottom: 8px;"><strong>💰 Bedrag:</strong> €30,00</li>
                <li style="margin-bottom: 8px;"><strong>📅 Betaaldatum:</strong> {{payment_date}}</li>
                <li style="margin-bottom: 8px;"><strong>🏷️ Bestelling:</strong> {{application_id}}</li>
                <li style="margin-bottom: 8px;"><strong>📦 Totaal bestelling:</strong> €300,00</li>
                <li style="margin-bottom: 0;"><strong>💳 Restbedrag:</strong> €270,00</li>
              </ul>
            </div>
          </div>
          
          <h3 style="color: #28a745; font-size: 20px;">🚀 Wat gebeurt er nu?</h3>
          <div style="background-color: white; border-radius: 8px; padding: 20px; border: 1px solid #e9ecef;">
            <ol style="margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 10px;"><strong>Productie start:</strong> Wij beginnen met het voorbereiden van uw Wasstrips bestelling</li>
              <li style="margin-bottom: 10px;"><strong>Levering:</strong> Uw producten worden binnen 5-7 werkdagen geleverd</li>
              <li style="margin-bottom: 0;"><strong>Restbetaling:</strong> Na levering ontvangt u een link voor het restbedrag van €270,00</li>
            </ol>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">💡 Tips voor succes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li style="margin-bottom: 8px;">Bereid uw verkoopstrategie voor</li>
              <li style="margin-bottom: 8px;">Denk na over uw doelgroep</li>
              <li style="margin-bottom: 0;">Overweeg sociale media promotie</li>
            </ul>
          </div>
          
          <p>Heeft u vragen over uw bestelling? Neem gerust contact met ons op via <a href="mailto:{{company_email}}" style="color: #28a745; text-decoration: none;">{{company_email}}</a>.</p>
          
          <p>Bedankt voor uw vertrouwen in Wasgeurtje!</p>
          
          <p style="margin-bottom: 0;">Met vriendelijke groet,<br>
          <strong>{{company_name}}</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>&copy; {{currentYear}} {{company_name}} | Dit is een automatisch gegenereerde e-mail.</p>
        </div>
      </div>
    `,
    text: `
Aanbetaling Ontvangen!

Beste {{retailer_name}},

Geweldig nieuws! Uw aanbetaling van €30,00 voor uw Wasstrips bestelling is succesvol ontvangen.

BETALINGSDETAILS:
- Bedrag: €30,00
- Betaaldatum: {{payment_date}}
- Bestelling: {{application_id}}
- Totaal bestelling: €300,00
- Restbedrag: €270,00

WAT GEBEURT ER NU?
1. Productie start: Wij beginnen met het voorbereiden van uw Wasstrips bestelling
2. Levering: Uw producten worden binnen 5-7 werkdagen geleverd
3. Restbetaling: Na levering ontvangt u een link voor het restbedrag van €270,00

TIPS VOOR SUCCES:
- Bereid uw verkoopstrategie voor
- Denk na over uw doelgroep
- Overweeg sociale media promotie

Heeft u vragen over uw bestelling? Neem gerust contact met ons op via {{company_email}}.

Bedankt voor uw vertrouwen in Wasgeurtje!

Met vriendelijke groet,
{{company_name}}

© {{currentYear}} {{company_name}} | Dit is een automatisch gegenereerde e-mail.
    `
  },
  'wasstrips-order-ready': {
    name: 'Wasstrips Bestelling Klaar',
    description: 'Melding dat bestelling binnen is en betaalopties beschikbaar zijn',
    subject: 'Uw Wasstrips bestelling is binnen - Kies uw betaalmethode 📦',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 30px; border-left: 4px solid #3b82f6;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1e40af; margin: 0; font-size: 28px;">🎉 Uw bestelling is binnen!</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Beste {{retailer_name}},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Geweldig nieuws! Uw Wasstrips bestelling is binnen en klaar voor verzending. 
            Om de verzending te starten, kunt u nu uw betaalmethode kiezen voor het restbedrag van <strong>€270,00</strong>.
          </p>
          
          <div style="background-color: white; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">💰 Betalingsoverzicht</h3>
            <ul style="margin: 0; padding-left: 20px; list-style: none;">
              <li style="margin-bottom: 8px;"><strong>🏷️ Bestelling ID:</strong> #{{application_id}}</li>
              <li style="margin-bottom: 8px;"><strong>💰 Totaal bestelling:</strong> €300,00</li>
              <li style="margin-bottom: 8px;"><strong>✅ Aanbetaling betaald:</strong> €30,00</li>
              <li style="margin-bottom: 0;"><strong>💳 Restbedrag:</strong> €270,00</li>
            </ul>
          </div>
          
          <div style="background-color: #ecfdf5; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">💡 Kies uw betaalmethode:</h3>
            
            <div style="margin: 15px 0;">
              <a href="{{payment_options_url}}" 
                 style="display: inline-block; width: 100%; background-color: #3b82f6; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; text-align: center; margin-bottom: 10px;">
                🏦 Direct betalen (iDEAL/Creditcard)
              </a>
            </div>
            
            <div style="margin: 15px 0;">
              <a href="{{payment_options_url}}" 
                 style="display: inline-block; width: 100%; background-color: #f59e0b; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; text-align: center;">
                📄 Betalen op factuur (14 dagen)
              </a>
            </div>
          </div>
          
          <div style="background-color: #fef3c7; border-radius: 6px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">
              ⚠️ <strong>Belangrijk:</strong> Uw bestelling wordt pas verzonden nadat u uw betaalmethode heeft gekozen.
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Heeft u vragen over de betaling? Neem gerust contact met ons op via <a href="mailto:{{company_email}}" style="color: #3b82f6; text-decoration: none;">{{company_email}}</a>.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Bedankt voor uw vertrouwen in Wasgeurtje!
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © {{currentYear}} {{company_name}}. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    `,
    text: `
      Beste {{retailer_name}},

      Geweldig nieuws! Uw Wasstrips bestelling is binnen en klaar voor verzending.
      
      Om de verzending te starten, kunt u nu uw betaalmethode kiezen voor het restbedrag van €270,00.

      Betalingsoverzicht:
      - Bestelling ID: #{{application_id}}
      - Totaal bestelling: €300,00
      - Aanbetaling betaald: €30,00
      - Restbedrag: €270,00

      Kies uw betaalmethode:
      1. Direct betalen (iDEAL/Creditcard)
      2. Betalen op factuur (14 dagen)

      Ga naar: {{payment_options_url}}

      BELANGRIJK: Uw bestelling wordt pas verzonden nadat u uw betaalmethode heeft gekozen.

      Heeft u vragen over de betaling? Neem gerust contact met ons op via {{company_email}}.

      Bedankt voor uw vertrouwen in Wasgeurtje!

      Met vriendelijke groet,
      Het Wasgeurtje Team

      © {{currentYear}} Wasgeurtje.nl
    `
  },

  'wasstrips-shipped': {
    name: 'Wasstrips Verzendbevestiging',
    description: 'Bevestigingsmail na verzending van Wasstrips bestelling',
    subject: 'Uw Wasstrips bestelling is verzonden! 📦',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{logoUrl}}" alt="Wasgeurtje Logo" style="max-width: 240px; max-height: 80px; object-fit: contain;" />
        </div>
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 30px; border-left: 4px solid #3b82f6;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1e40af; margin: 0; font-size: 28px;">📦 Uw bestelling is verzonden!</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Beste {{retailer_name}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Goed nieuws! Uw Wasstrips bestelling is vandaag verzonden en onderweg naar u toe.
          </p>
          <div style="background-color: white; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">📋 Verzenddetails</h3>
            <ul style="margin: 0; padding-left: 20px; list-style: none;">
              <li style="margin-bottom: 8px;"><strong>📅 Verzenddatum:</strong> {{shipping_date}}</li>
              <li style="margin-bottom: 8px;"><strong>🏷️ Bestelling ID:</strong> #{{application_id}}</li>
              {{#if has_tracking}}
              <li style="margin-bottom: 0;"><strong>📦 Track & Trace:</strong> <span style="color: #3b82f6; font-weight: 600;">{{tracking_code}}</span></li>
              {{/if}}
            </ul>
          </div>
          {{#if has_tracking}}
          <div style="background-color: #ecfdf5; border-radius: 6px; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46; font-weight: 500;">
              💡 <strong>Tip:</strong> Gebruik de Track & Trace code hierboven om uw zending te volgen bij de vervoerder.
            </p>
          </div>
          {{/if}}
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>Wat gebeurt er nu?</strong>
          </p>
          <ul style="padding-left: 20px; margin-bottom: 20px;">
            <li style="margin-bottom: 8px;">Uw pakket wordt binnen 1-3 werkdagen bezorgd</li>
            <li style="margin-bottom: 8px;">Na ontvangst krijgt u een email voor het restbedrag van €270,00</li>
            <li style="margin-bottom: 8px;">Het restbedrag kunt u betalen via iDEAL of factuur</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Heeft u vragen over uw zending? Neem gerust contact met ons op via <a href="mailto:{{company_email}}" style="color: #3b82f6; text-decoration: none;">{{company_email}}</a>.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Bedankt voor uw vertrouwen in Wasgeurtje!
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © {{currentYear}} {{company_name}}. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    `,
    text: `
      Beste {{retailer_name}},

      Goed nieuws! Uw Wasstrips bestelling is vandaag verzonden en onderweg naar u toe.

      Verzenddetails:
      - Verzenddatum: {{shipping_date}}
      - Bestelling ID: #{{application_id}}
      {{#if has_tracking}}- Track & Trace: {{tracking_code}}{{/if}}

      Wat gebeurt er nu?
      - Uw pakket wordt binnen 1-3 werkdagen bezorgd
      - Na ontvangst krijgt u een email voor het restbedrag van €270,00
      - Het restbedrag kunt u betalen via iDEAL of factuur

      Heeft u vragen over uw zending? Neem gerust contact met ons op via {{company_email}}.

      Bedankt voor uw vertrouwen in Wasgeurtje!

Met vriendelijke groet,
Het Wasgeurtje Team

© {{currentYear}} Wasgeurtje.nl
    `
  },

};

// Kompileert een Handlebars-achtige template met context
export const compileTemplate = (template: string, context: Record<string, any>) => {
  if (!template) return '';

  // Voeg huidige jaar toe voor copyright vermeldingen
  context.currentYear = new Date().getFullYear();
  
  // Handlebars-achtige syntax ondersteunen
  let result = template;

  // Vervang eenvoudige variabelen {{variable}}
  result = result.replace(/\{\{([^#\/\s}]+)\}\}/g, (match, key) => {
    return context[key] !== undefined ? context[key] : '';
  });

  // Ondersteun if statements {{#if variable}}...{{/if}}
  const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, condition, content) => {
    return context[condition] ? content : '';
  });

  // Ondersteuning voor iteraties {{#each items}}...{{/each}}
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  result = result.replace(eachRegex, (match, arrayName, content) => {
    if (!Array.isArray(context[arrayName])) return '';
    
    return context[arrayName].map((item: any) => {
      let itemContent = content;
      
      // Vervang @key met object keys (voor object iteraties)
      itemContent = itemContent.replace(/\{\{@key\}\}/g, () => {
        return Object.keys(item).join(', ');
      });
      
      // Vervang item properties
      for (const [key, value] of Object.entries(item)) {
        const propRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        itemContent = itemContent.replace(propRegex, String(value));
      }
      
      return itemContent;
    }).join('');
  });

  return result;
};

// Haal templates op uit de database, of gebruik standaard templates als ze niet bestaan
export const getEmailTemplates = async (): Promise<TemplatesRecord> => {
  try {
    // In development mode with no database configured, just return default templates
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('Development mode: using default email templates');
      return defaultTemplates;
    }
    
    // Probeer templates op te halen uit de database
    const { data, error } = await supabase
      .from('email_templates')
      .select('*');
    
    if (error) {
      console.error('Error fetching email templates:', error);
      // Instead of failing, fall back to default templates
      return defaultTemplates;
    }
    
    // Als er geen templates in de database zijn, gebruik standaard templates
    if (!data || data.length === 0) {
      return defaultTemplates;
    }
    
    // Converteer database resultaten naar het juiste formaat
    const templates: Partial<TemplatesRecord> = {};
    data.forEach(template => {
      if (isTemplateKey(template.key)) {
      templates[template.key] = {
        name: template.name,
        description: template.description,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };
      }
    });
    
    // Merge with default templates to ensure all keys exist
    return { ...defaultTemplates, ...templates };
  } catch (error) {
    console.error('Error getting email templates:', error);
    // Always fall back to default templates if there's any error
    return defaultTemplates;
  }
};

// Type guard for template keys
function isTemplateKey(key: string): key is TemplateKey {
  return key in defaultTemplates;
}

// Haal een specifieke template op
export const getEmailTemplate = async (templateKey: TemplateKey | string): Promise<EmailTemplate | null> => {
  try {
  const templates = await getEmailTemplates();
    // Check if the templateKey is valid
    if (isTemplateKey(templateKey)) {
  return templates[templateKey] || defaultTemplates[templateKey];
    }
    return null;
  } catch (error) {
    console.error(`Error getting email template '${templateKey}':`, error);
    if (isTemplateKey(templateKey)) {
      return defaultTemplates[templateKey];
    }
    return null;
  }
};

// Sla een template op in de database
export const saveEmailTemplate = async (
  templateKey: string,
  template: {
    name: string;
    description: string;
    subject: string;
    html: string;
    text: string;
  }
) => {
  try {
    const { error } = await supabase
      .from('email_templates')
      .upsert({
        key: templateKey,
        name: template.name,
        description: template.description,
        subject: template.subject,
        html: template.html,
        text: template.text,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error saving email template:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving email template:', error);
    return { success: false, error };
  }
};

// Reset een template naar standaard waarden
export const resetEmailTemplate = async (templateKey: string) => {
  try {
    if (!isTemplateKey(templateKey)) {
      return { success: false, error: 'Template niet gevonden' };
    }
    
    const defaultTemplate = defaultTemplates[templateKey];
    
    const { error } = await supabase
      .from('email_templates')
      .upsert({
        key: templateKey,
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        subject: defaultTemplate.subject,
        html: defaultTemplate.html,
        text: defaultTemplate.text,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error resetting email template:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting email template:', error);
    return { success: false, error };
  }
}; 