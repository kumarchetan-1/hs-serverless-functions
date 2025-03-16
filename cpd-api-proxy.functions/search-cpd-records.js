const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/p_cpd_records";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN; // Securely stored token

// 1. SEARCH CPD RECORDS (Check if a user & video entry exists)
exports.main = async (context, sendResponse) => {
  try {
    const { contactId, videoId } = context.body;

    // Fetch contact associations with CPD records
    const contactResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/p_cpd_records`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!contactResponse.ok) {
      throw new Error(`HTTP error! Status: ${contactResponse.status}`);
    }

    const contactData = await contactResponse.json();
    const contactIds = contactData.results.map((item) => item.id);

    let hubdbRecordId = null;
    const tableName = "elearning_table"; // Your table name
    const videoIdToFind = videoId; // Replace with the actual video_id

    const hubdbUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableName}/rows?portalId=25717290`;
    // let matchingRow = null
    try {
      const hubDb_response = await fetch(hubdbUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      const hubDbData = await hubDb_response.json();

      const matchingRow = hubDbData.results.find(
        (row) => row.values.video_id === videoIdToFind
      );
      if (matchingRow) {
        hubdbRecordId = matchingRow.id;
      } else {
        console.log("No matching row found.");
      }
    } catch (error) {
       console.log("Internal error occurred");
       
    }

    // Search for CPD record with the given hubdbRecordId and contact associations
    const searchResponse = await fetch(`${HUBSPOT_API_URL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "hubdb_record_id",
                operator: "EQ",
                value: hubdbRecordId,
              },
              {
                propertyName: "hs_object_id",
                operator: "IN",
                values: contactIds,
              },
            ],
          },
        ],
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`HTTP error! Status: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log("🔍 HubSpot API Response:", searchData);

    const records = searchData.results;

    // If record exists, return the ID
    if (records && Array.isArray(records) && records.length > 0) {
      sendResponse({
        statusCode: 200,
        body: {
          exists: true,
          id: records[0].id,
          message: "A record already exists for this user and video.",
          hubdbRecordId
        },
      });
    } else {
      sendResponse({
        statusCode: 200,
        body: { exists: false, message: "No records found.", hubdbRecordId: hubdbRecordId },
      });
    }
  } catch (error) {
    console.error("Error searching CPD records:", error);
    sendResponse({ statusCode: 500, body: { error: error.message } });
  }
};
