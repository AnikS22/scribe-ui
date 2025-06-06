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
  const painRatingEl = document.getElementById("pain-rating")
  const followUpEl = document.getElementById("follow-up")
  const icdCodesEl = document.getElementById("icd-codes")
  const lcdValidationEl = document.getElementById("lcd-validation")

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
    // Clear all content
    chiefComplaintEl.textContent = ""
    historyEl.textContent = ""
    assessmentEl.textContent = ""
    planEl.textContent = ""
    painRatingEl.textContent = ""
    followUpEl.textContent = ""
    icdCodesEl.innerHTML = ""
    lcdValidationEl.innerHTML = ""
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

      // Display pain rating if available
      if (data.pain_rating) {
        const painLevel = data.pain_rating.level || "Not specified"
        const painLocation = data.pain_rating.location || "Not specified"
        painRatingEl.innerHTML = `
          <p><strong>Pain Level:</strong> ${painLevel}</p>
          <p><strong>Location:</strong> ${painLocation}</p>
        `
      } else {
        painRatingEl.textContent = "Not specified"
      }

      // Display follow-up instructions if available
      followUpEl.textContent = data.follow_up_instructions || "Not specified"

      // Display CPT codes
      const cptContainer = document.getElementById("cpt-results")
      cptContainer.innerHTML = "" // Clear previous

      if (Array.isArray(data.recommended_cpt_codes)) {
        data.recommended_cpt_codes.forEach((cpt) => {
          const item = document.createElement("div")
          item.className = "cpt-box"
          
          // Determine LCD status class
          let lcdStatusClass = "text-gray-600" // default
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

          item.innerHTML = `
            <div class="cpt-box-content">
              <p class="cpt-code">
                <strong>CPT Code:</strong> ${cpt.code} – ${cpt.description}
              </p>
              <p class="lcd-requirement">
                <strong>Requires LCD:</strong> 
                ${cpt.requires_lcd ? `✅ Yes${cpt.lcd_code ? ` – ${cpt.lcd_code}` : ''}` : '❌ No'}
              </p>
              ${cpt.requires_lcd ? `
                <p class="lcd-status">
                  <strong>LCD Status:</strong> 
                  ${lcdStatusIcon} <span class="${lcdStatusClass}">${cpt.lcd_status || 'Not Evaluated'}</span>
                </p>
              ` : ''}
            </div>
          `
          cptContainer.appendChild(item)
        })
      } else {
        cptContainer.innerHTML = '<p class="no-cpt">No CPT codes recommended</p>'
      }

      // Display ICD codes
      const icdContainer = document.getElementById("icd-codes")
      icdContainer.innerHTML = "" // Clear previous

      if (Array.isArray(data.icd_codes) && data.icd_codes.length > 0) {
        const icdList = document.createElement("ul")
        icdList.className = "icd-list"
        data.icd_codes.forEach(code => {
          const li = document.createElement("li")
          li.className = "icd-code"
          li.textContent = code
          icdList.appendChild(li)
        })
        icdContainer.appendChild(icdList)
      } else {
        icdContainer.innerHTML = '<p class="no-data">No ICD codes provided</p>'
      }

      // Display LCD validation results
      const lcdContainer = document.getElementById("lcd-validation")
      lcdContainer.innerHTML = "" // Clear previous

      if (Array.isArray(data.lcd_validation) && data.lcd_validation.length > 0) {
        data.lcd_validation.forEach(lcd => {
          const item = document.createElement("div")
          item.className = "lcd-box"

          // Determine status class and icon
          let statusClass = "text-gray-600"
          let statusIcon = "❓"
          
          switch(lcd.status?.toLowerCase()) {
            case "meets":
              statusClass = "text-green-600"
              statusIcon = "✅"
              break
            case "partially meets":
              statusClass = "text-yellow-600"
              statusIcon = "⚠️"
              break
            case "does not meet":
              statusClass = "text-red-600"
              statusIcon = "❌"
              break
          }

          // Create requirements list
          const requirementsList = Array.isArray(lcd.requirements) && lcd.requirements.length > 0
            ? `<ul class="requirements-list">
                ${lcd.requirements.map(req => `<li>${req}</li>`).join("")}
               </ul>`
            : "<p>No specific requirements listed</p>"

          item.innerHTML = `
            <div class="lcd-box-content">
              <p class="lcd-code">
                <strong>LCD Code:</strong> ${lcd.lcd_code || "Not specified"}
              </p>
              <p class="lcd-status">
                <strong>Status:</strong> 
                ${statusIcon} <span class="${statusClass}">${lcd.status || "Not Evaluated"}</span>
              </p>
              <div class="requirements">
                <strong>Requirements:</strong>
                ${requirementsList}
              </div>
            </div>
          `
          lcdContainer.appendChild(item)
        })
      } else {
        lcdContainer.innerHTML = '<p class="no-data">No LCD validation results available</p>'
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
