/**
 * QuoteHub Widget — drop-in form handler for client websites
 *
 * Usage:
 *   <form data-quotehub-slug="eltec-electrical" data-quotehub-source="https://eltec-electrical.vercel.app/">
 *     <input name="customer_name" placeholder="Your name" required />
 *     <input name="customer_email" placeholder="Email" />
 *     <input name="customer_phone" placeholder="Phone" />
 *     <select name="service_type">
 *       <option value="">Service needed</option>
 *       ...
 *     </select>
 *     <textarea name="message"></textarea>
 *     <button type="submit">Send</button>
 *   </form>
 *   <script src="https://YOUR-DOMAIN/widget.js" async></script>
 *
 * This script finds all forms with data-quotehub-slug, intercepts their submit
 * event, POSTs the form data to QuoteHub API, and handles the redirect/response.
 */

(function () {
  const API_URL = document.currentScript?.getAttribute('data-api') ||
    'https://YOUR-DOMAIN/api/quote'

  function init() {
    const forms = document.querySelectorAll('form[data-quotehub-slug]')

    forms.forEach(function (form) {
      if (form.dataset.quotehubInitialized) return
      form.dataset.quotehubInitialized = 'true'

      const slug = form.dataset.quotehubSlug
      const source = form.dataset.quotehubSource || window.location.href

      form.addEventListener('submit', async function (e) {
        e.preventDefault()

        const formData = new FormData(form)
        const data = {
          client_slug: slug,
          source_url: source,
        }

        for (const [key, value] of formData.entries()) {
          data[key] = value
        }

        // Show submitting state
        const submitBtn = form.querySelector('[type="submit"]')
        const originalText = submitBtn ? submitBtn.textContent : ''
        if (submitBtn) {
          submitBtn.textContent = 'Sending...'
          submitBtn.disabled = true
        }

        try {
          const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (res.ok) {
            const result = await res.json()
            // Redirect to success page
            if (result.redirect_url) {
              window.location.href = result.redirect_url
            } else {
              // Fallback: add ?sent=true to current URL
              const url = new URL(window.location.href)
              url.searchParams.set('sent', 'true')
              window.location.href = url.toString()
            }
          } else {
            alert('Something went wrong. Please try again or call us directly.')
          }
        } catch (err) {
          console.error('QuoteHub submission error:', err)
          alert('Something went wrong. Please try again or call us directly.')
        } finally {
          if (submitBtn) {
            submitBtn.textContent = originalText
            submitBtn.disabled = false
          }
        }
      })
    })
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
