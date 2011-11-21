var currentLanguage;
var phrases = [];

var TYPE_COMMENT = 1;
var TYPE_SUGGESTION = 2;
var TYPE_APPROVED = 3;
var TYPE_ORIGINAL_CHANGED = 3;

function sendSuggestion() {
    var $tr = $(this).parents('tr');
    var translation = $tr.find('input[type=text]').val();
    var original = $tr.find('.original').text();

    var args = {
        original: original,
        translation: translation
    };

    if (translation.length > 0) {
        showLoadingBar();
        $.post('/api/translations/' + currentLanguage, args, function() {
            hideLoadingBar();
        });
    }
}

function showComments() {
    var $tr = $(this).parents('tr');
    var $popup = $('#commentsPopup');
    var $submit = $popup.find('input[type=submit]');
    var $textarea = $popup.find('textarea');

    var index = $tr.index();
    var phrase = phrases[index];
    var original = $tr.find('.original').text();
    var commentText = $textarea.val();

    function loadHistory() {
        $popup.find('ul').html('');
        $.each(phrases[index].history.reverse(), function(i, item) {
            var $li = $('<li></li>');
            $('<span class="date"></span>').text(item.date).appendTo($li);
            $('<span class="user"></span>').text(item.user.name).appendTo($li);
            $('<span class="text"></span>').text(item.text).appendTo($li);
            $popup.find('ul').append($li);
        });
    }

    loadHistory();

    $textarea.val('');
    $popup.find('h2').text(original);
    $submit.unbind('click');
    $submit.click(function(data) {
        var args = {
            lang: currentLanguage,
            text: $textarea.val()
        };
        showLoadingBar();
        $button = $(this);
        $button.attr('disabled', 'disabled');
        $.post('/translations/' + phrase.id + '/comments', args, function() {
            hideLoadingBar();
            $button.removeAttr('disabled');
            phrases[index].history.push({
                user: {
                    id: my_user_id,
                    name: my_user_name,
                },
                date: 'Just now...',
                type: TYPE_COMMENT,
                text: args.text,
            });
            $textarea.val('');
            loadHistory();
            $tr.find('.comments').html('').append(createCommentsElement(index));
        });
    });

    showPopup('commentsPopup');
}

function createCommentsElement(phraseIndex) {
    var text;
    var numComments = phrases[phraseIndex].history.length;

    if (numComments === 1) {
        text = '1 comment';
    } else if (numComments > 1) {
        text = numComments + ' comments';
    } else {
        text = 'Comment';
    }

    return $('<span class="clickable"></span>').text(text).click(showComments);
}

function changeApproveState() {
    var $tr = $(this).parents('tr');
    var index = $tr.index();
    var phrase = phrases[index];

    var args = {
        lang: currentLanguage,
    };

    $.post("/translations/" + phrase.id + "/approve", args, function(data) {
        alert("Translation state changed");
    });
}

function createTableRow(phraseIndex, original, translation, approved) {
    var tr = $('<tr></tr>');

    var td1 = $('<td></td').attr('class', 'original').text(original);
    var td2 = $('<td></td').attr('class', 'translation');
    var td3 = $('<td></td').attr('class', 'comments');
    var td4 = $('<td></td').attr('class', 'approved');

    $('<input type="text" />').val(translation).appendTo(td2);
    $('<input type="submit" />').val("Send suggestion").click(sendSuggestion).appendTo(td2);

    createCommentsElement(phraseIndex).appendTo(td3);

    var checkbox = $('<input type="checkbox" />').val(false);
    checkbox.appendTo(td4);
    if (approved) {
        checkbox.attr('checked', 'checked');
    }
    checkbox.change(changeApproveState);

    var label = $('<label></label>').text('Approved');
    label.appendTo(td4);

    td1.appendTo(tr);
    td2.appendTo(tr);
    td3.appendTo(tr);
    td4.appendTo(tr);

    return tr;
}

function loadLanguage() {
    currentLanguage = $('#language').val(); // global

    function loadLeaders() {
        $("#leaders").html('');
        $.getJSON('/translations/leaders', {lang:currentLanguage}, function(data) {
            $.each(data, function(i, item) {
                $('<li></li').text(item.user.name).appendTo('#leaders');
            });
        });
    }

    function loadTranslations() {
        showLoadingBar();
        $.getJSON('/api/translations/' + currentLanguage, {comments:1}, function(data) {
            hideLoadingBar();
            var $tbody = $('<tbody></tbody>');
            phrases = data; // global

            $.each(data, function(i, item) {
                createTableRow(i, item.original, item.translation, item.approved).appendTo($tbody);
            });

            $('tbody').replaceWith($tbody);
        });
    }

    loadLeaders();
    loadTranslations();

    history.pushState(null, null, '/translations/' + currentLanguage);
}

$(document).ready(function() {
    $('#language').change(loadLanguage);

    var path = window.location.pathname.split('/');
    if (path.length === 3) { // e.g. /translations/sv_SE
        $.each($('#language option'), function(i, elem) {
            if ($(elem).attr('value') === path[2]) {
                $(elem).attr('selected', 'selected');
                $('#language').change();
                return false;
            }
        });
    } else {
        $('#language').change();
    }
});