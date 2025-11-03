(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoodiesValidators = factory();
})(this, function(){
  function validateCampaign(data){
    const errors = {};
    const title = (data.title || '').trim();
    const description = (data.description || '').trim();
    const goal = Number(data.goal);
    if (!title) errors.title = 'Title is required';
    else if (title.length > 100) errors.title = 'Title must be 100 characters or fewer';
    if (!description) errors.description = 'Description is required';
    else if (description.length > 1000) errors.description = 'Description must be 1000 characters or fewer';
    if (data.goal == null || String(data.goal).trim() === '') errors.goal = 'Funding goal is required';
    else if (Number.isNaN(goal) || goal <= 0) errors.goal = 'Enter a valid goal greater than 0';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  return { validateCampaign };
});
