document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transcript-form")
  const generateBtn = document.getElementById("generate-btn")
  const spinner = document.getElementById("spinner")
  const errorContainer = document.getElementById("error-container")
  const resultsContainer = document.getElementById("results-container")

  // Result section elements
  const chiefComplaintEl = document.getElementById("chief-complaint")
  const historyEl = document.getElementById("history")
  const assessmentEl = document.getElementById("assessment")
  const planEl = document.getElementById("plan")

  // API configuration
  const API_CONFIG = {
    baseUrl: "/api",  // This will be proxied through Vercel
    endpoint: "/relay",
    headers: {
      "Content-Type": "application/json"
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Get the transcript text
    const transcript = document.getElementById("transcript").value.trim()

    if (!transcript) {
      showError("Please enter a patient transcript.")
      return
    }

    // Show loading state
    setLoading(true)
    hideError()
    hideResults()

    try {
      // Make API request
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`, {
        method: "POST",
        headers: API_CONFIG.headers,
        body: JSON.stringify({ transcript })
      })

      // Handle different response statuses
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      // Parse response
      const data = await response.json()

      // Validate response data
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from server")
      }

      // Display results
      displayResults(data)
    } catch (error) {
      console.error("Error processing transcript:", error)
      showError(error.message || "Failed to process transcript. Please try again.")
    } finally {
      setLoading(false)
    }
  })

  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.disabled = true
      spinner.style.display = "block"
      generateBtn.querySelector("span").textContent = "Processing..."
    } else {
      generateBtn.disabled = false
      spinner.style.display = "none"
      generateBtn.querySelector("span").textContent = "Generate Note"
    }
  }

  function showError(message) {
    errorContainer.textContent = message
    errorContainer.classList.remove("hidden")
  }

  function hideError() {
    errorContainer.classList.add("hidden")
    errorContainer.textContent = ""
  }

  function hideResults() {
    resultsContainer.classList.add("hidden")
  }

  function displayResults(data) {
    try {
      // Format and display each section with fallbacks
      chiefComplaintEl.textContent = data.chief_complaint || "Not specified"
      historyEl.textContent = data.history_of_present_illness || "Not specified"
      assessmentEl.textContent = data.assessment || "Not specified"
      planEl.textContent = data.plan || "Not specified"

      // Display CPT codes
      const cptContainer = document.getElementById("cpt-results")
      cptContainer.innerHTML = "" // Clear previous

      if (Array.isArray(data.recommended_cpt_codes)) {
        data.recommended_cpt_codes.forEach((cpt) => {
          const item = document.createElement("div")
          item.className = "cpt-code-item"
          item.innerHTML = `
            <strong>${cpt.code}</strong>: ${cpt.description} <br/>
            LCD Required: <strong>${cpt.requires_lcd ? "Yes" : "No"}</strong><br/>
            ${cpt.lcd_code ? `LCD Code: <strong>${cpt.lcd_code}</strong>` : ""}
            <hr/>
          `
          cptContainer.appendChild(item)
        })
      }

      // Show results container
      resultsContainer.classList.remove("hidden")

      // Scroll to results with smooth behavior
      resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch (error) {
      console.error("Error displaying results:", error)
      showError("Error displaying results. Please try again.")
    }
  }
})
