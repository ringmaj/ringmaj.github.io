/*
 * Smooth scrolling anchor navigation.
 *   Usage:
 *     <script src="smooth-scroll.js" type="text/javascript"></script>
 *     <script type="text/javascript">
 *       window.addEventListener('load', SmoothScrolling.configureEventHandlers);
 *     </script>
 */
var SmoothScrolling = {
    last_event_interval: false,
    tween_distance: 30,

    configureEventHandlers: function() {
        var links = document.getElementsByTagName('a');
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.href && link.href.indexOf('#') > -1)
                link.addEventListener('click', SmoothScrolling.eventHandler);
        }
    },

    eventHandler: function(event) {
        var destination_hash    = event.target.hash.substr(1);
        var destination_element = document.getElementById(destination_hash);

        if (!destination_element)
            return;

        clearInterval(SmoothScrolling.last_event_interval);

        var destination_y = destination_element.offsetTop;
        var tween_distance = SmoothScrolling.tween_distance;
        var interval = 'SmoothScrolling.scrollViewport('
                     + tween_distance + ', '
                     + destination_y + ', '
                     + '\'' + destination_hash + '\')';
        SmoothScrolling.last_event_interval = setInterval(interval, 10);

        event.preventDefault();
        event.stopPropagation();
    },

    scrollViewport: function(distance, destination_y, destination_hash) {
        var prior_position_y = window.pageYOffset;

        // Don't scroll too far
        if ((prior_position_y + distance) > destination_y)
            distance = (prior_position_y + distance) - destination_y;

        window.scrollTo(0, prior_position_y + distance);

        // If we're there or can't get any closer because of the viewport's
        // size, stop!
        if ((window.pageYOffset >= destination_y) || (window.pageYOffset == prior_position_y)) {
            clearInterval(SmoothScrolling.last_event_interval);
            location.hash = destination_hash;
        }
    }
}