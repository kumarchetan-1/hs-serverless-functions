const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/p_cpd_records";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN; // Securely stored token
const HUBDB_ELEARNING_TABLE_ID = "elearning_table"; // Replace with actual table ID
const HUBDB_CPD_TABLE_ID = "total_cpd_training_hours"; // Replace with actual table ID

async function fetchHubDBRow(tableId, rowId) {
    const url = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows/${rowId}?portalId=25717290`;
    
    const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch HubDB row: ${response.status} - ${await response.text()}`);
    }

    return await response.json();
}

async function updateCPDTrainingHours(contactId, cpdHours) {
    const currentYear = new Date().getFullYear();
    const tableUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${HUBDB_CPD_TABLE_ID}`;

    // Fetch existing records for the contact
    const existingResponse = await fetch(`${tableUrl}/rows?contact_id=${contactId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
    });

    const existingData = await existingResponse.json();
    if (!existingData || !Array.isArray(existingData.results)) {
        console.error("Unexpected response structure from HubDB:", existingData);
        throw new Error("Invalid response: Missing 'results' array");
    }
    
    let existingRow = existingData.results.find(row => row.values.contact_id === contactId);

    if (existingRow) {
        // Update the existing record by adding new CPD hours
        const updatedHours = (existingRow.values[`total_hours_${currentYear}`] || 0) + cpdHours;
    
    await fetch(`${tableUrl}/${existingRow.id}/rows/draft`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: { [`total_hours_${currentYear}`]: updatedHours } })
    });
        
    await fetch(`${tableUrl}/${existingRow.id}/draft/publish`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
        }
        });
    } else {
        // Create a new row if contact doesn't exist
        await fetch(`${tableUrl}/rows`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                values: {
                    contact_id: contactId,
                    [`total_hours_${currentYear}`]: cpdHours
                }
            })
        });
    }
}

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

        // Fetch e-learning data
        const elearningData = await fetchHubDBRow(HUBDB_ELEARNING_TABLE_ID, hubdbRecordId);

        if (!elearningData || !elearningData.values.cpd_enabled) {
            throw new Error("CPD is not enabled for this record.");
        }
        
        if (elearningData.values.cpd_hours) {
            let cpdHours = elearningData.values.cpd_hours  
        } else{
            cpdHours = 0;
        }
         
        await updateCPDTrainingHours(contactId, cpdHours);

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