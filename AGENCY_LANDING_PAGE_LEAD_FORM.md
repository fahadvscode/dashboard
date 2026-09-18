# Landing page lead form — integration spec

Use this on every HTML landing page you build for us.

You design the page. We capture the lead. **Do not** send leads to Google Forms, Mailchimp, your own database, or email-only.

After a successful submit, we save the lead, email the team, and add a row to our Google Sheet automatically.

---

## Credentials (we will fill these in)

| Item | Value |
|------|--------|
| Webhook URL | `https://property-dashboard-three.vercel.app/api/leads/ingest` |
| Secret | `PASTE_SECRET_HERE` |

Send the secret in this header on every request:

```
X-Lead-Webhook-Secret: PASTE_SECRET_HERE
```

Do not put the secret in the page URL, in GitHub, or in a public README.

---

## What each page must send

Hardcode `project_name` and `source` on **each page**. The visitor should never type these.

| Field | Required | Example | Notes |
|--------|----------|---------|--------|
| `first_name` | Yes | `"Sara"` | Visitor |
| `last_name` | Yes | `"Khan"` | Visitor |
| `email` | Yes | `"sara@email.com"` | Visitor |
| `phone` | Yes | `"4165551234"` | Visitor. Digits with or without formatting is fine |
| `is_broker` | Yes | `false` | `true` / `false`, or `"yes"` / `"no"` |
| `source` | Yes | `"https://caledonstationhomes.ca"` | Full website URL of **this** landing page |
| `project_name` | Yes | `"Caledon Station"` | Project name we give you for that page |

Optional (send if you have them):

| Field | Example |
|--------|---------|
| `page_path` | `"/"` or `"/register"` |
| `notes` | Free-text message from the form |
| `utm_source` | `"google"` |
| `utm_campaign` | `"launch"` |

Include a hidden field named `fax` and leave it empty. Do not show it. We use it to drop bots.

---

## Request

`POST` JSON to the webhook URL.

```http
POST /api/leads/ingest
Content-Type: application/json
X-Lead-Webhook-Secret: PASTE_SECRET_HERE
```

```json
{
  "first_name": "Sara",
  "last_name": "Khan",
  "email": "sara@email.com",
  "phone": "4165551234",
  "is_broker": false,
  "source": "https://caledonstationhomes.ca",
  "project_name": "Caledon Station",
  "page_path": "/",
  "fax": ""
}
```

---

## Responses

**Success** — `200`

```json
{ "ok": true, "id": "uuid" }
```

Show a thank-you message. Do not submit again.

**Validation error** — `400`

```json
{ "ok": false, "error": "Missing required fields. ..." }
```

Show the error, keep the form filled, let them retry.

**Bad secret** — `401`

```json
{ "ok": false, "error": "Invalid webhook secret." }
```

**Server error** — `500`

Ask them to try again. Do not lose the form values.

CORS is enabled. You can POST from the browser on any domain.

---

## Copy-paste HTML example

Change only the two constants at the top for each page: `PROJECT_NAME` and `SOURCE_URL`.

```html
<form id="lead-form">
  <input name="first_name" type="text" placeholder="First name" required>
  <input name="last_name" type="text" placeholder="Last name" required>
  <input name="email" type="email" placeholder="Email" required>
  <input name="phone" type="tel" placeholder="Phone" required>
  <label>
    <input name="is_broker" type="checkbox">
    I am a realtor / broker
  </label>
  <!-- honeypot: leave empty, hide with CSS -->
  <input name="fax" type="text" tabindex="-1" autocomplete="off" style="display:none">
  <button type="submit">Submit</button>
  <p id="lead-form-status" role="status"></p>
</form>

<script>
  const WEBHOOK_URL = 'https://property-dashboard-three.vercel.app/api/leads/ingest'
  const WEBHOOK_SECRET = 'PASTE_SECRET_HERE'

  // Hardcode these per page — do not let the visitor edit them
  const PROJECT_NAME = 'Caledon Station'
  const SOURCE_URL = 'https://caledonstationhomes.ca'

  const form = document.getElementById('lead-form')
  const statusEl = document.getElementById('lead-form-status')

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    statusEl.textContent = 'Sending…'

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lead-Webhook-Secret': WEBHOOK_SECRET
        },
        body: JSON.stringify({
          first_name: String(data.get('first_name') || '').trim(),
          last_name: String(data.get('last_name') || '').trim(),
          email: String(data.get('email') || '').trim(),
          phone: String(data.get('phone') || '').trim(),
          is_broker: data.get('is_broker') === 'on',
          source: SOURCE_URL,
          project_name: PROJECT_NAME,
          page_path: window.location.pathname || '/',
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
          fax: String(data.get('fax') || '')
        })
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Could not submit. Please try again.')
      }

      form.reset()
      statusEl.textContent = 'Thank you. We will be in touch shortly.'
    } catch (error) {
      statusEl.textContent = error.message || 'Could not submit. Please try again.'
      button.disabled = false
    }
  })
</script>
```

---

## Per-page values

Use a new `PROJECT_NAME` + `SOURCE_URL` for every site. Examples:

| Page | `project_name` | `source` |
|------|----------------|----------|
| Caledon Station | `Caledon Station` | `https://caledonstationhomes.ca` |
| Next project | `Exact project name we give you` | `https://that-site.com` |

If one domain has two projects, still send the correct `project_name` for the form the visitor used.

---

## Test before you launch a page

Send one test lead with a real name + email we can see:

```bash
curl -X POST https://property-dashboard-three.vercel.app/api/leads/ingest \
  -H "Content-Type: application/json" \
  -H "X-Lead-Webhook-Secret: PASTE_SECRET_HERE" \
  -d '{
    "first_name": "Test",
    "last_name": "Agency",
    "email": "test@youragency.com",
    "phone": "4165550000",
    "is_broker": false,
    "source": "https://YOUR-PAGE.com",
    "project_name": "YOUR PROJECT NAME"
  }'
```

You should get `{ "ok": true, "id": "..." }`. Then tell us. We will confirm it arrived.

Launch checklist:

- [ ] Form POSTs to the webhook (not to email, Google Forms, or another CRM)
- [ ] Secret header is present
- [ ] `project_name` and `source` are hardcoded for that page
- [ ] Broker checkbox is on the form
- [ ] Hidden `fax` field is empty
- [ ] Thank-you state shows on success
- [ ] Failed submit keeps the typed values and shows an error
- [ ] One test lead sent and confirmed by us

---

## Do not

- Do not store leads in Google Sheets, Airtable, or your own backend as the source of truth
- Do not email the lead to us instead of using the webhook
- Do not skip `project_name` or `source`
- Do not let the visitor type the project name
- Do not share the webhook secret in a public repo or client-side screenshot
- Do not call any other URL for leads
