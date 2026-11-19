const Encryption = require('../Encryptions')

const database = async () => {
  return {
    users: [
      {
        email: 'admin@mailinator.com',
        firstName: "Test",
        lastName: "Admin",
        password: await Encryption.sha256("123456"),
        phNumber: "+923442484597",
        userTypeId: 1,
      },
      {
        email: 'customer@mailinator.com',
        firstName: "Test",
        lastName: "Customer",
        password: await Encryption.sha256("123456"),
        phNumber: "+923442484597",
        userTypeId: 2,
      },
    ],
    userType: [
      { title: "Admin", description: "Super Admin User" },
      { title: "Customer", description: "Customer" },
    ],
    products: [
      {
        plan: "default",
        name: "Default Package",
        description: "This is a test product",
        price: 1.00,
        hours: 5,
        currency: "C$",
        stripeId: "none",
        type: "payment",
        buttonText: "Buy",
        expiry: 'month'
      },
      {
        plan: "test",
        name: "Test Product 1",
        description: "This is a test product",
        price: 1.00,
        hours: 50,
        currency: "C$",
        stripeId: "price_1NVd0NLlgdu0MxcMnDn3JKtT",
        type: "payment",
        buttonText: "Buy",
        expiry: 'month'
      },
      {
        plan: "testsubscription",
        name: "Test Subscription",
        description: "This is a test subscription for recurring payments",
        price: 2.00,
        hours: 100,
        currency: "C$",
        stripeId: "price_1NVw1gLlgdu0MxcMRLSW820D",
        type: "payment",
        buttonText: "Buy",
        expiry: 'month'
      }
    ],
    prompts: [
      {
        title: "getSummary",
        type: 1,
        request: JSON.stringify({
          model: 'gpt-3.5-turbo-16k',
          temperature: 0.61,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 8000,
          messages: []
        }),
        prompt: JSON.stringify([
          {
            "role": "system",
            "content": "Given a partial transcript from a meeting, create a shorter and more concise version under 200 tokens. Make it read like an actual transcript."
          },
          {
            "role": "user",
            "content": `Transcript: <value_goes_here>`
          }
        ])
      },
      {
        title: "getFinalSummary",
        type: 1,
        request: JSON.stringify({
          model: 'gpt-3.5-turbo-16k',
          temperature: 0.61,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 8000,
          messages: []
        }),
        prompt: JSON.stringify([
          {
            "role": "system",
            "content": "Create a meeting minutes from the provided transcript in HTML format. Keep it under 8,000 tokens in total and include:\n" + "Summary\n" + "Key Discussions\n" + "Action items\n" + "Decisions\n" + "Suggestions by Kolabrya\n" + "(Imagine Kolabrya is you, provide some suggestions based on your understanding of the transcript)\n" + "Example:\n" + "<h2>Summary:</h2>\n" + "<p>Singapore has successfully developed sustainably and positioned itself as a model for urban development.</p>\n" + "<h2>Key Discussions:</h2>\n" + "<ul>\n" + "<li>The challenge of creating livable urban spaces in expanding cities</li>\n" + "<li>The responsibility of the Singapore Development Board in creating living spaces for 80% of the city\'s residents</li>\n" + "</ul>\n" + "<h2>Action Items:</h2>\n" + "<ul>\n" + "<li>john made a decision regarding an unspecified matter</li>\n" + "</ul>\n" + "<h2>Key Decisions:</h2>\n" + "<ul>\n" + "<li>Amanda and Fareed will provide updates</li>\n" + "</ul>" + "<h2>Suggestions by Kolabrya:</h2>\n" + "<ul>\n" + "<li>should need to participate more, to get deisgn level thinking.</li>\n" + "</ul>"
          },
          {
            "role": "user",
            "content": `Transcript: <value_goes_here>`
          }
        ]),

      },
      {
        title: "getActionItemsMap",
        type: 1,
        request: JSON.stringify({
          model: 'gpt-3.5-turbo-16k',
          temperature: 0.61,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 8000,
          messages: []
        }),
        prompt: JSON.stringify([
          {
            "role": "system",
            "content": `Actasacoach,
                      putthegivenmeetingminutesintotheJSONformatgo.jslibrary.Putonesentenceineachkey.KeysareSummaryKeyDiscussionsActionitemsDecisionsSuggestionsbyKolabryaUseexamplebelowtolearnhowtocreatethisJSONformat: {
                        "class": "go.GraphLinksModel",
                        "nodeDataArray": [
                          {
                            "key": "Summary",
                            "text": "Summary",
                            "isGroup": true,
                            "color": "0",
                            "loc": "0 23.5"
                          },
                          {
                            "key": "Key Discussions",
                            "text": "Key Discussions",
                            "isGroup": true,
                            "color": "1",
                            "loc": "109 23.5"
                          },
                          {
                            "key": "Action items",
                            "text": "Action Items",
                            "isGroup": true,
                            "color": "2",
                            "loc": "235 23.5"
                          },
                          {
                            "key": "Decisions",
                            "text": "Decisions",
                            "isGroup": true,
                            "color": "0",
                            "loc": "343 23.5"
                          },
                          {
                            "key": "Suggestions by Kolabrya",
                            "text": "Suggestions by Kolabrya",
                            "isGroup": true,
                            "color": "1",
                            "loc": "451 23.5"
                          },
                          {
                            "key": 1,
                            "text": "Summary Text A",
                            "group": "Summary",
                            "color": "1",
                            "loc": "12 35.5"
                          },
                          {
                            "key": 2,
                            "text": "Discussion A",
                            "group": "Key Discussions",
                            "color": "2",
                            "loc": "121 35.5"
                          },
                          {
                            "key": 3,
                            "text": "Action A",
                            "group": "Action items",
                            "color": "0",
                            "loc": "247 35.5"
                          },
                          {
                            "key": 4,
                            "text": "Decision A",
                            "group": "Decisions",
                            "color": "1",
                            "loc": "355 35.5"
                          },
                          {
                            "key": 5,
                            "text": "Suggestion A",
                            "group": "Suggestions by Kolabrya",
                            "color": "2",
                            "loc": "463 35.5"
                          }
                        ],
                        "linkDataArray": [
                          
                        ]
                      }`
          },
          {
            "role": "user",
            "content": `MeetingMinutes: <value_goes_here>`
          },

        ]),
      },
      {
        title: "generateProductivityScores",
        type: 1,
        request: JSON.stringify({
          model: 'gpt-3.5-turbo-16k',
          temperature: 0.61,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 8000,
          messages: []
        }),
        prompt: JSON.stringify([
          {
            "role": "system",
            "content": `actasaprofessionalorganizationalcoachandanalyzethemeetingtranscriptandproduce1)meetingproductivityand2)meetingcollaborationscorestothemeetingtranscriptionprovidedbyuserprompt.Usethefollowingscales: NeedsImprovementHighMediumProductivitymeanshoweffectiveandefficientthemeetingwas.Collaborationmeanshowwellteammembersinthemeetinginteractedandcollaboratedtodiscussorsolveissuesandproblems`
          },
          {
            "role": "user",
            "content": `Giventhetranscriptbelowgeneratemeetingproductivityandcollaborationscoresusingoneofthefollowingscales: NeedsImprovementHighMediumYouroutputshouldlooklikethis: ProductivityScoreis" "Waystoimprove" "lessthan4wordsCollaborationscoreis" "Waystoimprove: " "lessthan4wordsMeeting: '<value_goes_here>'`
          },

        ]),
      },
      {
        title: "generateConceptMap",
        type: 1,
        request: JSON.stringify({
          model: 'gpt-3.5-turbo-16k',
          temperature: 0.61,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 8000,
          messages: []
        }),
        prompt: JSON.stringify([
          {
            "role": "system", "content": `From the provided text, carefully sift through and extract detailed discussions. Disregard any non-business discussions, small talks, or chit-chat. Using the business-centric topics Replace the root node (\"Mind Map\") with a title indicative of the meeting's main subject or theme.
    
                        Construct the mind map with the following structure:
                        ONE central root node representing the meeting's main theme. Major related categories branching from the root node. For each major category, add child nodes. Each child node can further branch into up to sub-nodes.
                        Keep the text of nodes succinct with a maximum of 5 words.    
                        Assign unique keys for each node and provide positioning similar to the example.
                        Differentiate with colors for each major category and its corresponding nodes.
                        Balance node placement by alternating directions \"left\" and \"right\" around the parent node. 
                        Ensure an even distribution between the two sides.\n\nUse the following example structure as a guide.
                        
                        Example as guide:
                        { "class": "go.TreeModel",
                          "nodeDataArray": [
                        {"key":0, "text":"Mind Map", "loc":"0 0"},
                        {"key":1, "parent":0, "text":"Getting more time", "brush":"skyblue", "dir":"right", "loc":"77 -22"},
                        {"key":11, "parent":1, "text":"Wake up early", "brush":"skyblue", "dir":"right", "loc":"200 -48"},
                        {"key":12, "parent":1, "text":"Delegate", "brush":"skyblue", "dir":"right", "loc":"200 -22"},
                        {"key":13, "parent":1, "text":"Simplify", "brush":"skyblue", "dir":"right", "loc":"200 4"},
                        {"key":2, "parent":0, "text":"More effective use", "brush":"darkseagreen", "dir":"right", "loc":"77 43"},
                        {"key":21, "parent":2, "text":"Planning", "brush":"darkseagreen", "dir":"right", "loc":"203 30"},
                        {"key":211, "parent":21, "text":"Priorities", "brush":"darkseagreen", "dir":"right", "loc":"274 17"},
                        {"key":212, "parent":21, "text":"Ways to focus", "brush":"darkseagreen", "dir":"right", "loc":"274 43"},
                        {"key":22, "parent":2, "text":"Goals", "brush":"darkseagreen", "dir":"right", "loc":"203 56"},
                        {"key":3, "parent":0, "text":"Time wasting", "brush":"palevioletred", "dir":"left", "loc":"-20 -31.75"},
                        {"key":31, "parent":3, "text":"Too many meetings", "brush":"palevioletred", "dir":"left", "loc":"-117 -64.25"},
                        {"key":32, "parent":3, "text":"Too much time spent on details", "brush":"palevioletred", "dir":"left", "loc":"-117 -25.25"},
                        {"key":33, "parent":3, "text":"Message fatigue", "brush":"palevioletred", "dir":"left", "loc":"-117 0.75"},
                        {"key":331, "parent":31, "text":"Check messages less", "brush":"palevioletred", "dir":"left", "loc":"-251 -77.25"},
                        {"key":332, "parent":31, "text":"Message filters", "brush":"palevioletred", "dir":"left", "loc":"-251 -51.25"},
                        {"key":4, "parent":0, "text":"Key issues", "brush":"coral", "dir":"left", "loc":"-20 52.75"},
                        {"key":41, "parent":4, "text":"Methods", "brush":"coral", "dir":"left", "loc":"-103 26.75"},
                        {"key":42, "parent":4, "text":"Deadlines", "brush":"coral", "dir":"left", "loc":"-103 52.75"},
                        {"key":43, "parent":4, "text":"Checkpoints", "brush":"coral", "dir":"left", "loc":"-103 78.75"}
                         ]
                        }`
          },
          {
            "role": "user", "content": `Here's a text. Extract detailed discussions and generate a JSON-structured mind map.
                        Transcript:'<value_goes_here>'`
          },
        ]),
      }
    ],
    promptType: [
      {
        id: 1,
        type: 'Generic (default)',
      },
      {
        id: 2,
        type: 'Project Status Update',
      },
      {
        id: 3,
        type: 'Planning',
      },
      {
        id: 4,
        type: 'Brainstorming',
      },
      {
        id: 5,
        type: 'Problem Solving',
      }
    ]
  }
}

module.exports = database;