import * as $ from 'jquery';

// Saves options to chrome.storage.sync.
function save_options() {
  var remoteEndpoint = $('#endpoint').val();
  var remoteToken = $('#token').val();
  chrome.storage.sync.set({
    remoteEndpoint,
    remoteToken
  }, function() {
    // Update status to let user know options were saved.
    var status = $('#status');
    status.text('Options saved.');
    setTimeout(function() {
      status.text('');
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    remoteEndpoint: 'ws://127.0.0.1:8138/remote',
    remoteToken: null
  }, function(items: {remoteEndpoint, remoteToken}) {
    $('#endpoint').val(items.remoteEndpoint);
    $('#token').val(items.remoteToken);
  });
}

$('#save').click(save_options);
$(restore_options); // document.addEventListener('DOMContentLoaded', restore_options);

