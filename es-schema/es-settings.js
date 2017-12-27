let esSettings =
{
  "settings":{
    "analysis":{
      "analyzer":{
        "autocomplete":{
          "type":"custom",
          "tokenizer":"standard",
          "filter":[ "standard", "lowercase", "stop", "ngram" ]
        },
        "search_ngram": {
          "type": "custom",
          "tokenizer": "keyword",
          "filter": [ "standard", "lowercase", "stop", "ngram" ]
        },
        "keyword_lowercase_analyzer": {
          "type": "custom",
          "filter": ["lowercase"],
          "tokenizer": "keyword"
        }
      },
      "filter":{
        "ngram":{
          "type":"ngram",
          "min_gram":2,
          "max_gram":15
        }
      }
    }
  }
}
