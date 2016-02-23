(function() {
  var game;
  var ui;

  var main = function(dendryUI) {
    ui = dendryUI;
    game = ui.game;
    /* The game engine sets up accessors on the state object, which are used
     * to update the UI when qualities change. But it won't set up accessors
     * if we don't tell it to.
     */
    game.qualitySignal = true; // Set up accessors globally...
    game.qualities = {
      // ...but only for quality definitions that exist from the start.
      month: {}
      // And so on ad nauseam for all qualities the UI should track
    }

    // We can find out what qualities are being changed by inspecting the state
    // object, game.state; in the browser console, we can attach it to a
    // temporary variable and look at it as the game proceeds.
    console.log(game);

    // Add your custom code here.
  };

  window.dendryModifyUI = main;
}());
