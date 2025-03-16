const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/p_cpd_records";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN; 

// CREATE CPD RECORD
exports.main = async (context, sendResponse) => {
    try {
        const {
            recordName,
            hubdbRecordId,
            submissionDate,
            rating,
            comment,
            feedback,
            watched,
            contactId
        } = context.body;

        const recordData = {
            properties: {
                record_name: recordName,
                hubdb_record_id: hubdbRecordId,
                submission_date: submissionDate,
                rating: rating,
                comment: comment,
                feedback: feedback,
                watched: watched ? "Yes" : "No"
            },
            associations: [
                {
                    to: { id: contactId },
                    types: [{ associationCategory: "USER_DEFINED", associationTypeId: 150 }]
                }
            ]
        };

        const response = await fetch(HUBSPOT_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(recordData)
        });

        // 🔹 Check if the request was successful
        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(`HubSpot API Error: ${response.status} - ${JSON.stringify(errorResponse)}`);
        }

        const data = await response.json();

        // 🔹 Return the newly created record's ID
        sendResponse({
            statusCode: 200,
            body: {
                success: true,
                id: data.id,
                message: "CPD record created successfully."
            }
        });

    } catch (error) {
        console.error("❌ Error creating CPD record:", error);
        sendResponse({
            statusCode: 500,
            body: { success: false, error: error.message }
        });
    }
};