// Postgress init here
// Schema in separate file?
const env = require('../db_config.js').environment;
const options = require('../knexfile')[env];
const parse = require('../helpers/parsers.js');
const knex = require('knex')(options);

// EXAMPLE DATABASE ACCESS FUNCTION:
//
//module.exports.checkAccess = function(id) {
//  return knex
//     .select()
//     .from('sample')
//    // .where({id})
//};

module.exports.fetchRecipeList = function() {
  //return a list of short recipe descriptions
  return knex.select().from('recipes');
};


module.exports.fetchRecipeById = function(recipeId) {
  //return the recipe and all relevant accompanying information
  
  const queriesNeeded = [
    knex.select('*').from('recipes').where({id: recipeId}),
    knex.select({
        quantity: 'recipe_ingredients.quantity',
        position: 'recipe_ingredients.list_position',
        ndbno: 'ingredients.ndbno',
        name: 'ingredients.name',
        stdAmount: 'ingredients.std_amount',
        kcalPer: 'ingredients.kcal_per',
        fatPer: 'ingredients.fat_per',
        satFatPer: 'ingredients.sat_fat_per',
        fiberPer: 'ingredients.fiber_per',
        cholesterolPer: 'ingredients.cholesterol_per',
        sodiumPer: 'ingredients.sodium_per',
        carbsPer: 'ingredients.carbs_per',
        sugarPer: 'ingredients.sugar_per',
        proteinPer: 'ingredients.protein_per'
      })
      .from('recipe_ingredients')
      .join('ingredients', 'recipe_ingredients.food_no', '=', 'ingredients.ndbno')
      .where({'recipe_ingredients.recipe_id': recipeId})
      .orderBy('recipe_ingredients.list_position', 'asc')
  ]; 
  return Promise
    .all(queriesNeeded)
    .then(data => {
      if(data[0][0]) {
        return parse.databaseFullRecipeToClient(data)
      } else {
        return {status: 'No Such Recipe'};
      }
    });
};

module.exports.searchIngredientsByName = function(searchString) {
  //look for ingredients that might be the target and return them
  return knex.select('*')
    .from('ingredients')
    .where('name', 'ilike', '%'+searchString+'%');
};

module.exports.addIngredient = function(usdaIngredient) {
  //takes an ingredient object and stores it to the ingredients table
  //Assuming object is the usda return object's report.foods[0]'
  let dbIngredient = parse.usdaIngredientToDatabase(usdaIngredient);
  return knex('ingredients').insert(dbIngredient);
}

module.exports.addRecipeIngredient = function(recipeIngredient) {
  //takes an ingredient entry on a recipe and adds it to the recipe_ingredient junction table
}

module.exports.addRecipe = function(clientRecipe) {
  //takes a recipe object, adds the basic data to the db, then adds recipe ingredients 
  let outerRecipeId = '';
  return knex.transaction(trx => {
    const dbRecipe = {
      name: clientRecipe.title,
      description: clientRecipe.description,
      top_ingredients: clientRecipe.topIngredients,
      instructions: JSON.stringify(clientRecipe.instructions)
    };
    const dbIngredientJunction = clientRecipe.ingredients.map((ing, index) =>  {
      return {
        food_no: ing.ndbno,
        quantity: ing.quantity,
        quantity_measure: 'g',
        list_position: index
      }
    })

    return trx
      .insert(dbRecipe)
      .into('recipes')
      .returning('id')
      .then(recipeId => {
        outerRecipeId = recipeId;
        console.log('recipe ID: ', recipeId)
        return dbIngredientJunction.map(entry => {
          entry.recipe_id = recipeId[0];
          return trx
            .insert(entry)
            .into('recipe_ingredients');
        })
      })
      .all()
      .then(() => outerRecipeId);
  })
}