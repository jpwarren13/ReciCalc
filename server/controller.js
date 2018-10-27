const API_KEY = require('../config.js').API_KEY;
const db = require('../database/db.js');
const axios = require('axios');
const qs = require('qs');
const format = require('../helpers/formatCheckers.js');
module.exports.recipes = {
  getList: (req, res) => {
    //query datbase for a list of short recipe descriptions and return them
    db.fetchRecipeList()
      .then(data => {
        res.status(200).json(data);
      })
      .catch(err => {
        console.log('ERROR FETCHING RECIPE LIST FROM DB: ', err);
        res.status(500).send()
      });
  },
  getOne: (req, res) => {
    //endpoint: /api/recipes/:recipeId
    //query databse for detailed information on the given recipe and return it
    let recipeId = parseInt(req.params.recipeId);
    if(isNaN(recipeId)) {
      res.status(400).send('Malformed recipe ID');
    } else {
      db.fetchRecipeById(recipeId)
        .then(recipe => {
          if(recipe.status === 'No Such Recipe') {
            res.status(404).send(recipe);
          }
          else {
            res.status(200).json(recipe);
          }
        })
        .catch(err => {
          console.log('ERROR FETCHING FULL RECIPE FROM DB:', err)
          res.status(500).send(err);
        })
    }
  },
  post: (req, res) => {
    //Store recipe in database
    res.status(404).send('Under construction! We are not currently able to store data.');
  }
};

module.exports.ingredients = {
  getDbByName: (req, res) => {
    //expect req.query to have 'searchTerm'
    //Query database for ingredients matching a particular search string, and present them
    if(req.query.searchTerm === undefined) {
      res.status(400).send('Malformed search request');
    } else {
      db.searchIngredientsByName(req.query.searchTerm)
        .then(ingredients => {
          res.status(200).json(ingredients);
        })
        .catch(err => {
          console.log('ERROR SEARCHING FOR INGREDIENT: ', err);
          res.status(500).send();
        })
    }
  },
  getUsdaByName: (req, res) => {
    //Client-side example get function ------------->
    //Retrieves USDA NDBNO for ingredient that user searches for

    /*axios.get('api/ingredients/usda', {
      params: {
        searchTerm: 'deli ham',
        offset: req.query.offset
      }
    })
      .then((data) => {
        const list = data.data.map(item => {
          return [item.name, item.ndbno, item.group]
        })
        console.log(`${data.config.params.query} successfully searched: `,list);
      })
      .catch(error => {
        throw(error)
      });
      */


    //Query USDA NDB API for ingredients matching a particular search string, and present them

    //expect req.params to have 'searchTerm'
    //also expect it may have 'page'
    console.log('looking for USDA ingredients by name: ' + req.query.searchTerm)
    let offset = req.query.page ? req.query.page * 8 : 0;
    axios.get(`https://api.nal.usda.gov/ndb/search/?`, {
      params: {
        format: 'JSON',
        q: req.query.searchTerm,
        sort: 'r',
        max: 8,
        offset: offset,
        ds: 'Standard Reference',
        api_key: `${API_KEY}`
      },
    })
      .then((data) => {
        res.status(200).send(data['data']['list']['item']);
      })
      .catch(error => {
        throw(error);
      });
  },
  getUsdaIngredientInfo: (req, res) => {
    //Client-side example get function ------------->
    //Retrieves nutrients and info using ndbno number from user-selected ingredient

    /*axios.get('api/ingredients/usda/:', {
      params: {
        ndbno: '07028'
      }
    })
      .then(data => {
        console.log('success!', data.data[0], data.data[0].nutrients)
      })
      .catch(error => {
        throw(error.message);
      })
      */ 

    //expect req.params.ndbno 
    //Query USDA API for nutritional data about the provided item number
    if (format.isValidNdbno(req.params.ndbno) === false) {
      res.status(400).send('Malformed NDB number');
    }
    console.log('looking for nutrients by NDB no: ', req.params.ndbno);
    axios.get('https://api.nal.usda.gov/ndb/nutrients/?', {
      params: {
        format: 'JSON',
        api_key: `${API_KEY}`,
        nutrients: ['208', '204', '606', '291', '203', '307', '601', '269', '205'],
        ndbno: req.params.ndbno
      },
      paramsSerializer: function(params) {
        return qs.stringify(params, {indices: false})
      },
    })
      .then(data => {
        if(data.data.errors) {
          res.status(500).send(data.data.errors.error);
        } else {
          res.status(200).send(data.data.report.foods);
        }
      })
      .catch(error => {
        res.status(500).send();
      });
  },
  post: (req, res) => {
    //Store ingredient in database
    res.status(404).send('Under construction! We are not currently able to store data.');
  }
}


//EXAMPLE DATABASE INTERACTION:
//
//confirmAccess = function(req, res) => {
//  db.checkAccess(req.params.number)
//    .then(data => {
//      //do some calculations with the data and make formattedData
//      res.status(200).json(formattedData);
//    })
//    .catch(err => res.status(500).send(err));
//}