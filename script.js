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
      const response = await fetch("https://scribe-checker.onrender.com/process_transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      })

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      // Parse response
      const data = await response.json()

      // Display results
      displayResults(data)
    } catch (error) {
      console.error("Error processing transcript:", error)
      showError(`Failed to process transcript: ${error.message || "Unknown error"}`)
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
    // Format and display each section
    chiefComplaintEl.textContent = data.chief_complaint || "None provided"
    historyEl.textContent = data.history_of_present_illness || "None provided"
    assessmentEl.textContent = data.assessment || "None provided"
    planEl.textContent = data.plan || "None provided"

    // Show results container
    resultsContainer.classList.remove("hidden")

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: "smooth" })
  }
})
