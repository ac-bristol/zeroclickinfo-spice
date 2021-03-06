(function(env) {
    "use strict";

    // A change in the Rotten Tomatoes API returns images that end in _tmb.
    // This changes this to _det.
    function toDetail(img) {
        return img.replace(/tmb\.(jpg|png)/, "det.$1");
    }

    function get_image(critics_rating) {
        if (!critics_rating) {
            return;
        }

        // The filename is the same as the critics_rating, but
        // lowercased and with spaces converted to dashes.
        critics_rating = critics_rating.toLowerCase().replace(/ /, '-');
        return DDG.get_asset_path('in_theaters', critics_rating + ((DDG.is3x || DDG.is2x) ? '.retina.png' : '.png'));
    }

    env.ddg_spice_movie = function(api_result) {
        if (!api_result || !api_result.movies || !api_result.movies.length) {
            return Spice.failed('movie');
        }

        // Get original query.
        var script = $('[src*="/js/spice/movie/"]')[0],
            source = $(script).attr("src"),
            query = decodeURIComponent(source.match(/movie\/([^\/]+)/)[1]);

        //Remove parenthesis to match: Movie Name (2014)
        if (query.match(/\(.+?\)/g)) {
            query = query.replace(/\(|\)/g, '');
        }

        //Check if the query contains a year
        var year = query.match(/\d{4}/),
            singleResult = [];

        //Ensure year is vaild between 1900 - current year + 5
        year = (year >= 1900 && year <= new Date().getFullYear() + 5) ? year : null;


        if (year) {
            ///Check movie year and title against query
            $.each(api_result.movies, function(key, result) {
                if (!result.title.match(/\d{4}/)) { // don't run this check if the movie title contains a date
                    if (result.year == year && query.replace(year, '').trim() == result.title.toLowerCase()) {
                        singleResult.push(result);
                    }
                }
            });
            if (singleResult.length > 0) {
                api_result.movies = singleResult;
            } // return a single result if we have an exact match
        }

        Spice.add({
            id: 'movie',
            name: 'Movies',
            data: api_result.movies,
            meta: {
                sourceName: 'Rotten Tomatoes',
                sourceUrl: 'https://www.rottentomatoes.com/search/?search=' + query,
                itemType: 'Movies'
            },
            normalize: function(item) {
                // Modify the image from _tmb.jpg to _det.jpg
                var image = toDetail(item.posters.detailed);
                return {
                    rating: Math.max(item.ratings.critics_score / 20, 0),
                    image: image,
                    icon_image: get_image(item.ratings.critics_rating),
                    abstract: Handlebars.helpers.ellipsis(item.synopsis || item.critics_consensus, 200),
                    heading: item.title,
                    img: image,
                    img_m: image,
                    url: item.links.alternate,
                    is_retina: is_retina ? "is_retina" : "no_retina"
                };
            },
            templates: {
                group: 'media',
                options: {
                    variant: 'poster',
                    subtitle_content: Spice.movie.subtitle_content,
                    buy: Spice.movie.buy
                }
            },
            relevancy: {
                skip_words: ['movie', 'info', 'film', 'rt', 'rotten', 'tomatoes', 'rating', 'ratings', 'rotten'],
                primary: [{
                    key: 'title'
                }, {
                    key: 'posters.detailed',
                    match: /\.jpg$/,
                    strict: false
                }]
            }
        });

        // Make sure we hide the title and ratings.
        // It looks nice to show only the poster of the movie.
        var $dom = Spice.getDOM('movie')
        if ($dom && $dom.length) {
            $dom.find('.tile__body').hide();
        }
    };

    // Convert minutes to hr. min. format.
    // e.g. {{time 90}} will return 1 hr. 30 min.
    Handlebars.registerHelper("time", function(runtime) {
        var hours = '',
            minutes = runtime;
        if (runtime >= 60) {
            hours = Math.floor(runtime / 60) + ' hr. ';
            minutes = (runtime % 60);
        }
        return hours + (minutes > 0 ? minutes + ' min.' : '');
    });
}(this));