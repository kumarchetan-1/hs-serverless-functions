const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/p_cpd_records";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN; // Securely stored token

// Helper function for making API calls to HubSpot
async function fetchFromHubSpot(url, method = "GET", body = null) {
  try {
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`HubSpot API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    return null;
  }
}

// 1. SEARCH CPD RECORDS (Check if a user & video entry exists)
exports.main = async (context, sendResponse) => {
  try {
    const { contactId, videoId } = context.body;

    // Fetch contact associations with CPD records
    const contactData = await fetchFromHubSpot(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/p_cpd_records`
    );

    if (!contactData || !contactData.results) {
      return sendResponse({
        statusCode: 500,
        body: { error: "Failed to fetch contact associations." },
      });
    }

    const contactIds = contactData.results.map((item) => item.id);

    // Fetch video record from HubDB
    const tableName = "elearning_table";
    const hubdbUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableName}/rows?portalId=25717290`;

    const hubDbData = await fetchFromHubSpot(hubdbUrl);
    const hubdbRecordId = hubDbData?.results?.find((row) => row.values?.video_id === videoId)?.id || null;

    if (!hubdbRecordId) {
      console.log("No matching HubDB record found for video ID:", videoId);
    }

    // Search for CPD record with hubdbRecordId and contact associations
    const searchResponse = await fetchFromHubSpot(`${HUBSPOT_API_URL}/search`, "POST", {
      filterGroups: [
        {
          filters: [
            { propertyName: "hubdb_record_id", operator: "EQ", value: hubdbRecordId },
            { propertyName: "hs_object_id", operator: "IN", values: contactIds },
          ],
        },
      ],
    });

    if (!searchResponse || !searchResponse.results) {
      return sendResponse({
        statusCode: 200,
        body: { exists: false, message: "No records found.", hubdbRecordId },
      });
    }

    const records = searchResponse.results;

    sendResponse({
      statusCode: 200,
      body: records.length > 0
        ? {
            exists: true,
            id: records[0].id,
            message: "A record already exists for this user and video.",
            hubdbRecordId,
          }
        : { exists: false, message: "No records found.", hubdbRecordId },
    });
  } catch (error) {
    console.error("Error searching CPD records:", error);
    sendResponse({ statusCode: 500, body: { error: error.message } });
  }
};
