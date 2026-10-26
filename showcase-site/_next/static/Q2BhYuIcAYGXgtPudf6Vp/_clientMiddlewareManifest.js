self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/|api\\/|media\\/|files\\/|images\\/|brand\\/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|.*\\.[a-z0-9]+$).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$",
    "originalSource": "/((?!_next/|api/|media/|files/|images/|brand/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|.*\\.[a-z0-9]+$).*)"
  },
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/(.*\\.(?:php\\d?|aspx?|jsp|cgi|env|ini|bak|sql|sqlite|old|swp|log|ya?ml|toml)))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$",
    "originalSource": "/(.*\\.(?:php\\d?|aspx?|jsp|cgi|env|ini|bak|sql|sqlite|old|swp|log|ya?ml|toml))"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()