/**
 * Guides Controller
 */
Ext.define('Docs.controller.Guides', {
    extend: 'Docs.controller.Content',
    baseUrl: '#!/guide',
    title: 'Guides',

    refs: [
        {
            ref: 'viewport',
            selector: '#viewport'
        },
        {
            ref: 'index',
            selector: '#guideindex'
        },
        {
            ref: 'tree',
            selector: '#guidetree'
        }
    ],

    cache: {},

    init: function() {
        this.addEvents(
            /**
             * @event showGuide
             * Fired after guide shown. Used for analytics event tracking.
             * @param {String} guide  name of the guide.
             */
            "showGuide"
        );

        this.control({
            '#guidetree': {
                urlclick: function(url, event) {
                    this.handleUrlClick(url, event, this.getTree());
                }
            },
            'guideindex > thumblist': {
                urlclick: function(url) {
                    this.loadGuide(url);
                }
            },
            'indexcontainer': {
                afterrender: function(cmp) {
                    cmp.el.addListener('click', function(event, el) {
                        this.handleUrlClick(el.href, event);
                    }, this, {
                        preventDefault: true,
                        delegate: '.guide'
                    });
                }
            },
            '#guide': {
                afterrender: function(cmp) {
                    cmp.el.addListener('scroll', function(cmp, el) {
                        this.setScrollState(this.activeUrl, el.scrollTop);
                    }, this);
                }
            }
        });
    },

    // We don't want to select the class that was opened in another window,
    // so restore the previous selection.
    handleUrlClick: function(url, event, view) {
        // Remove everything up to #!
        url = url.replace(/.*#!?/, "#!");

        if (this.opensNewWindow(event)) {
            window.open(url);
            view && view.selectUrl(this.activeUrl ? this.activeUrl : "");
        }
        else {
            this.loadGuide(url);
        }
    },

    /**
     * Loads the guides index
     */
    loadIndex: function() {
        Ext.getCmp('treecontainer').showTree('guidetree');
        this.callParent();
    },

    /**
     * Loads guide.
     *
     * @param {String} url  URL of the guide
     * @param {Boolean} noHistory  true to disable adding entry to browser history
     */
    loadGuide: function(url, noHistory) {
        Ext.getCmp('card-panel').layout.setActiveItem('guide');
        Ext.getCmp('treecontainer').showTree('guidetree');
        var name = url.match(/^#!\/guide\/(.*)$/)[1];

        noHistory || Docs.History.push(url);

        if (this.cache[name]) {
            this.showGuide(this.cache[name], url, name);
        }
        else {
            this.cache[name] = "in-progress";
            Ext.data.JsonP.request({
                url: this.getBaseUrl() + "/guides/" + name + "/README.js",
                callbackName: name,
                success: function(json) {
                    this.cache[name] = json;
                    this.showGuide(json, url, name);
                },
                failure: function(response, opts) {
                    this.cache[name] = false;
                    this.getController('Failure').show404("Guide <b>"+name+"</b> was not found.");
                },
                scope: this
            });
        }
    },

    /**
     * Shows guide.
     *
     * @param {Object} json Guide json
     * @param {String} url URL of the guide
     * @param {Boolean} name Name of the guide
     */
    showGuide: function(json, url, name) {
        var reRendered = false;

        if (json === "in-progress") {
            return;
        }
        this.getViewport().setPageTitle(json.title);
        if (this.activeUrl !== url) {
            Ext.getCmp("guide").load({
                name: name,
                content: json.guide
            });
            reRendered = true;
        }
        this.activeUrl = url;
        this.scrollContent();
        this.fireEvent('showGuide', name, { reRendered: reRendered });
        this.getTree().selectUrl(url);
    },

    scrollContent: function() {
        Ext.get('guide').scrollTo('top', this.getScrollState(this.activeUrl));
    }

});
