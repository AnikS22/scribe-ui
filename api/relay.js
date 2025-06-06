export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://scribe-checker.onrender.com/process_transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.API_KEY  // secure secret
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error in relay:", error);
    res.status(500).json({ 
      error: "Internal server error",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
} 