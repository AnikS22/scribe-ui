document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transcript-form")
  const generateBtn = document.getElementById("generate-btn")
  const spinner = document.getElementById("spinner")
  const errorContainer = document.getElementById("error-container")
  const resultsContainer = document.getElementById("results-container")
  const rawJsonContainer = document.getElementById("raw-json")
  const gptResponseContainer = document.getElementById("gpt-response")

  // Result section elements
  const chiefComplaintEl = document.getElementById("chief-complaint")
  const historyEl = document.getElementById("history")
  const assessmentEl = document.getElementById("assessment")
  const planEl = document.getElementById("plan")

  // API configuration
  const API_CONFIG = {
    baseUrl: "/api",  // Using Vercel relay endpoint
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
    hideRawResponses()

    try {
      // Make API request through relay
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

      // Display formatted results
      displayResults(data)

      // Display raw responses
      displayRawResponses(data)
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

  function hideRawResponses() {
    if (rawJsonContainer) {
      rawJsonContainer.classList.add("hidden")
    }
    if (gptResponseContainer) {
      gptResponseContainer.classList.add("hidden")
    }
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
          item.className = "cpt-box"
          
          // Determine LCD status class
          let lcdStatusClass = "text-gray-600"
          let lcdStatusIcon = "❓"
          
          if (cpt.lcd_status) {
            switch(cpt.lcd_status.toLowerCase()) {
              case "meets":
                lcdStatusClass = "text-green-600"
                lcdStatusIcon = "✅"
                break
              case "partially meets":
                lcdStatusClass = "text-yellow-600"
                lcdStatusIcon = "⚠️"
                break
              case "does not meet":
                lcdStatusClass = "text-red-600"
                lcdStatusIcon = "❌"
                break
            }
          }

          // Create LCD status text
          const lcdStatusText = cpt.lcd_status || "Not evaluated"
          
          // Create LCD code text
          const lcdCodeText = cpt.lcd_code 
            ? `✅ Yes – ${cpt.lcd_code}`
            : "❌ No LCD required"

          item.innerHTML = `
            <div class="cpt-header">
              <strong>CPT Code:</strong> ${cpt.code} – ${cpt.description}
            </div>
            <div class="cpt-details">
              <p><strong>Requires LCD:</strong> ${lcdCodeText}</p>
              <p><strong>LCD Status:</strong> ${lcdStatusIcon} <span class="${lcdStatusClass}">${lcdStatusText}</span></p>
            </div>
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

  function displayRawResponses(data) {
    try {
      // Display API response
      if (rawJsonContainer) {
        const formattedJson = JSON.stringify(data, null, 2)
        rawJsonContainer.textContent = formattedJson
        rawJsonContainer.classList.remove("hidden")
      }

      // Display GPT response if available
      if (gptResponseContainer && data.gpt_response) {
        const formattedGptResponse = typeof data.gpt_response === 'string' 
          ? data.gpt_response 
          : JSON.stringify(data.gpt_response, null, 2)
        gptResponseContainer.textContent = formattedGptResponse
        gptResponseContainer.classList.remove("hidden")
      }
    } catch (error) {
      console.error("Error displaying raw responses:", error)
    }
  }
})
