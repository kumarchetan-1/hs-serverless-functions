const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const axios = require("axios");
const PORTAL_ID =  process.env.PORTAL_ID

exports.main = async (context, sendResponse) => {
  try {
    const contactId = context.params.contactId; // Get contact ID from the request

    if (!contactId) {
      sendResponse({
        statusCode: 400,
        body: { message: "Missing contactId parameter." }, 
      });
      return; 
    }

    const ASSOCIATION_TYPE_ID = "associationType=150"; // Association ID for watched_by_watched_videos

    const HUBSPOT_API_URL = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/p_cpd_records?${ASSOCIATION_TYPE_ID}`;

    const response = await axios.get(HUBSPOT_API_URL, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const cpdRecordIds = Array.from(
      new Set(response.data.results.map((record) => record.toObjectId))
    )


    // Step 2: Fetch details of each CPD record to get `hubdb_record_id`
    const recordsWithdetails = [];

    for (const recordId of cpdRecordIds) {
      const hubspotResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/p_cpd_records/${recordId}`,{
          headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          params: { properties: "hubdb_record_id, comment, rating, record_name, feedback, hs_createdate" },
        }
      );

      const hubdbRecordId = hubspotResponse.data?.properties?.hubdb_record_id;
      const comment = hubspotResponse.data?.properties?.comment;
      const rating = hubspotResponse.data?.properties?.rating;
      const recordName = hubspotResponse.data?.properties?.record_name;
      const feedback = hubspotResponse.data?.properties?.feedback;
      const createDate = hubspotResponse.data?.properties?.hs_createdate;

      const tableName = "elearning_table"; // Your table name
      const hubdbRecordIdToFind = hubdbRecordId; // Replace with the actual hubdbRecordId
  
      const hubdbUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableName}/rows?portalId=${PORTAL_ID}`;
      let videoIdFound = null;
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
          (row) => row.id === hubdbRecordIdToFind
        );
        if (matchingRow) {
          videoIdFound = matchingRow.values.video_id;
        } else {
          console.log("No matching row found.");
        }
      } catch(error){

      }

      recordsWithdetails.push({
        record_name: recordName || null,
        record_id: recordId || null,
        hubdb_record_id: hubdbRecordId || null, 
        hs_createdate: createDate || null,
        feedback: feedback || null,
        rating: rating || null,
        comment: comment || null,
        videoIdFound: videoIdFound || null
      });
    }

    // Step 3: Send response
    sendResponse({
      statusCode: 200,
      body: {
        data: recordsWithdetails,
        message: "CPD Records retrieved successfully.",
        success: true,
      },
    });

  } catch (error) {
    console.error("Error fetching CPD Records:", error.response?.data || error.message);
    
    sendResponse({
      statusCode: error.response?.status || 500,
      body: {
        message: "Internal Server Error",
        error: error.response?.data || error.message,
      },
    });
  }
};