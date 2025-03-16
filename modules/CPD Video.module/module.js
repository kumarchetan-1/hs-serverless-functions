function getVideoId() {
  const originalEmbed = document.querySelector(".embed_container");
  if (!originalEmbed) {
    console.error("Original element '.embed_container' not found.");
    return null;
  }

  const clonedEmbed = originalEmbed.cloneNode(true);
  clonedEmbed.id = "notes_embed_container";

  const iframe = clonedEmbed.querySelector("iframe");
  if (!iframe) {
    console.error("No iframe found inside the cloned container.");
    return null;
  }

  const iframeSrc = iframe.getAttribute("src");
  const match = iframeSrc?.match(/vimeo\.com\/video\/(\d+)/);
  if (!match || !match[1]) {
    // console.error("Vimeo video ID not found.");
    return null;
  }

  const videoId = match[1];
  console.log("🎥 Vimeo Video ID:", videoId);

  const targetContainer = document.querySelector(".cpd-records .video-container");
  if (targetContainer) {
    targetContainer.appendChild(clonedEmbed);
  } else {
    console.error("Target container '.cpd-records .video-container' not found.");
  }

  return videoId;
}

document.addEventListener("DOMContentLoaded", async () => {
  const videoId = getVideoId();
  let hubdbRecordId = null
  if (!videoId) return;

  const contactId = document.querySelector(".cpd-records-reveal-btn")?.getAttribute("data-contactid");
  if (!contactId) {
    console.error("User contact ID not found. Please log in and try again.");
    return;
  }

  try {
    console.log("Checking for existing record...");
    const existingResponse = await fetch("https://community.drawingandtalking.com/_hcms/api/search-cpd-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, videoId }),
    });

    const existingData = await existingResponse.json();
    hubdbRecordId = existingData.hubdbRecordId
    console.log(existingData);
    if (existingData.exists) {
      console.log(` Record Found! ID: ${existingData.id}`);
      const toggleBtn = document.getElementById("toggle-btn");
      if (toggleBtn) {
        toggleBtn.innerText = "Video already marked as watched video";
        toggleBtn.disabled = true
      }
    }
  } catch (error) {
    console.error(" Error checking existing record:", error);
  }

  const submitBtn = document.querySelector(".cpd-records .submit-btn");
  if (!submitBtn) {
    console.error("Submit button not found.");
    return;
  }

  submitBtn.addEventListener("click", async () => {
    const recordName = document.title?.trim().replace(/["<>]/g, "") || "Untitled Video";
    const midnightUTC = new Date();
    midnightUTC.setUTCHours(0, 0, 0, 0);
    const submissionDate = midnightUTC.getTime();
    const rating = document.querySelector("input[name='rating']:checked")?.value ?? null;
    const comment = document.querySelector("#notes")?.value.trim() ?? "";
    const feedback = document.querySelector("#feedback")?.value.trim() ?? "";
    const watched = document.querySelector("#watched")?.checked ?? false;

    if (!watched) {
      alert("Please confirm that you watched the video before submitting feedback.");
      return;
    }

    try {
      // console.log(" No existing record found. Creating new record...");
      const cpdRecord = {
        recordName,
        hubdbRecordId: hubdbRecordId,
        submissionDate,
        rating,
        comment,
        feedback,
        watched,
        contactId,
      };

      // console.log("CPD record", JSON.stringify(cpdRecord));
      const createResult = await createCPDRecord(cpdRecord);
      if (createResult.success) {
        // console.log(` CPD Record Created! ID: ${createResult.id}`);
        document.querySelector(".cpd-records").style.display = "none";
      } else {
        // console.log(" CPD Record Creation Failed:", createResult.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong! Please try again.");
    }
  });
});



async function createCPDRecord(recordData) {
  const submitBtn = document.querySelector(".cpd-records .submit-btn");

  if (submitBtn) {
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;
  }

  try {
    const response = await fetch("https://community.drawingandtalking.com/_hcms/api/create-cpd-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recordData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, Response: ${JSON.stringify(data)}`);
    }

    // console.log(" API Response:", data);

    if (data.id) {
      const toggleBtn = document.getElementById("toggle-btn");
      toggleBtn.innerText = "Successfully marked as watched video";
      toggleBtn.disabled = true
      return { success: true, id: data.id, message: "CPD record created successfully." };
    } else {
      return { success: false, message: "Record creation failed." };
    }
  } catch (error) {
    // console.error(" Error in createCPDRecord:", error);
    return { success: false, error: error.message };
  }
}