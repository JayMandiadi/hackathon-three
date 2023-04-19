var express = require("express");
const axios = require('axios');
const { convert } = require('html-to-text');

var router = express.Router();
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY || ""
  });

const openai = new OpenAIApi(configuration);


/* GET home page. */
router.get("/", async function (req, res, next) {

 
  res.status(200).json(answer)
});

// Set the Azure DevOps organization and project details
const org = process.env.AZURE_ORGANIZATION;
const project = process.env.AZURE_PROJECT;
const base_url = `https://dev.azure.com/${org}/${project}`;

// Set the Azure DevOps credentials
const username = process.env.AZURE_USERNAME;
const password = process.env.AZURE_PASSWORD;

async function generateTicketInfo(workItems) {
    console.log("work items", workItems)
    const prompt = `Please explain the following sprint tickets for Codev's Internal or Customer Portal. Please make a short suggestion on the best way to tackle these with the intention of a product owner helping a developer finish these tasks in two weeks and make sure to mention the id number of the ticket you are explaining. If these tasks doesnt seem doable in a two week sprint let me know: \n
    ${workItems.map((item) => {
        return `Ticket:${item.id} Title:${convert(item.fields?.["System.Title"] || "")}  Story Points:${item.fields?.["Microsoft.VSTS.Scheduling.StoryPoints"]}\n`
    })}
    `
    console.log("prompt", prompt)
    const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 1024,
        top_p: 1,
        n:1,
        stop: null,
        temperature: 0.8
    });
    return response.data.choices.map(choice =>( {...choice, text: convert(choice.text).replaceAll(/\n/g, ' ')}));
}

async function getSprintWorkItems(req) {
     // Set the query to get work items assigned to the specific user and containing acceptance criteria
     const query = `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.Tags], [System.Description] FROM workitems WHERE [System.AssignedTo] = '${req.params.user}' AND [System.IterationPath] = '${process.env.AZURE_PROJECT}\\Sprint ${req.params.sprint}' AND [State] <> 'Closed'`;
     // Set the URL to get the work items based on the query
     const url = `${base_url}/_apis/wit/wiql?api-version=7.0`;
 
     // Set the request headers
     const headers = {
       "Content-Type": "application/json",
       "Authorization": `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
     };
 
     // Set the request body with the query
     const body = { query };
 
     // Make the API request to get the work item IDs
     const response = await axios.post(url, body, { headers });
     const workItemIds = response.data.workItems.map(workItem => workItem.id);
 
     // Set the URL to get the work item details
     const detailsUrl = `${base_url}/_apis/wit/workitems?ids=${workItemIds.join()}&api-version=7.0`;
 
     // Make the API request to get the work item details
     const detailsResponse = await axios.get(detailsUrl, { headers });
     return detailsResponse.data.value;
 
}

// Define the route to get the work items for a specific user that contain the acceptance criteria
router.get('/workitems/:user/sprint/:sprint', async (req, res) => {
  try {
   
    const workItems = await getSprintWorkItems(req)
    // Send the work item details back as the response
    const ticketPriority = await generateTicketInfo(workItems)
    res.json(ticketPriority);
  } catch (error) {
    console.error(error);
    res.status(error?.response?.status || 500).send(error);
  }
});

module.exports = router;
