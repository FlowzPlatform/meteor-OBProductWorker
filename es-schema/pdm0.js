let ESSchema = {
  "mappings": {
    "product": {
      "properties": {
        "status":{
          "type": "boolean"
        },
        "is_vmc":{
          "type": "boolean"
        },
        "categories": {
          "type": "text",
          "fields": {
            "raw": {
              "type": "keyword"
            },
            "english": {
              "type": "text",
              "analyzer": "english"
            }
          }
        },
        "product_name": {
          "type": "string",
          "analyzer": "standard",
          "search_analyzer": "search_ngram",
          "fields": {
            "raw": {
              "type": "string",
              "analyzer": "keyword_lowercase_analyzer"
            },
            "english": {
              "type":     "text",
              "analyzer": "english"
            }
          }
        },
        "linename": {
          "type": "text",
          "fields": {
            "raw": {
              "type": "keyword"
            },
            "english": {
              "type":     "text",
              "analyzer": "english"
            }
          }
        },
        "attributes": {
          "properties": {
            "colors": {
              "type": "text",
              "fields": {
                "raw": {
                  "type": "keyword"
                },
                "english": {
                  "type":     "text",
                  "analyzer": "english"
                }
              }
            },
            "size": {
              "type": "text",
              "fields": {
                "raw": {
                  "type": "keyword"
                }
              }
            }
          }
        },
        "country": {
          "type": "text"
        },
        "language": {
          "type": "text"
        },
        "currency": {
          "type": "text"
        },
        "description": {
          "type": "text",
          "fields": {
            "english": {
              "type":     "text",
              "analyzer": "english"
            }
          }
        },
        "default_image": {
          "type": "text"
        },
        "default_image_color_code": {
          "type": "text"
        },
        "default_color": {
          "type": "text"
        },
        "price": {
          "type": "double"
        },
        "matrix_price": {
          "type": "double"
        },
        "matrix_frieght": {
          "type": "double"
        },
        "packaging_charges": {
          "type": "double"
        },
        "vat": {
          "type": "double"
        },
        "vat_unit": {
          "type": "text"
        },
        "search_keyword": {
          "type": "text",
          "analyzer": "standard",
          "search_analyzer": "search_ngram",
          "fields": {
            "raw": {
              "type": "string",
              "analyzer": "keyword_lowercase_analyzer"
            },
            "english": {
              "type":     "text",
              "analyzer": "english"
            }
          }
        },
        "sku": {
          "type": "text",
          "fields": {
            "raw": {
              "type": "keyword"
            },
            "english": {
              "type": "text",
              "analyzer": "english"
            }
          }
        },
        "valid_up_to": {
          "type": "date"
        },
        "special_price_valid_up_to": {
          "type": "date"
        },
        "distributor_central_url": {
          "type": "text"
        },
        "imprint_data" : {
            "type" : "nested",
            "properties" : {
            "imprint_method": {
              	"type": "text"
              },
              "imprint_position": {
              	"type": "text"
                  },
              "imprint_area": {
                  "type": "text"
              },
              "matrix": {
                  "type": "text"
              },
              "max_imprint_color_allowed": {
                  "type": "integer"
              },
              "price_included": {
                  "type": "integer"
              },
              "max_location_allowed": {
                  "type": "integer"
              },
              "location_price_included": {
                  "type": "integer"
              },
              "full_color": {
                  "type": "text"
              },
              "production_days": {
                  "type": "text"
              },
              "production_unit": {
                  "type": "text"
              },
              "setup_charge": {
                  "type": "double"
              },
              "additional_location_charge": {
                  "type": "double"
              },
              "additional_color_charge": {
                  "type": "double"
              },
              "rush_charge": {
                  "type": "double"
              },
              "ltm_charge": {
                  "type": "double"
              },
              "pms_charge": {
                  "type": "double"
              },
              "price_range" : {
          		    "type": "nested",
          		    "properties":{
          			    "qty": {
          				"type": "integer_range"
          			     },
          			    "price":{
          			      "type": "double"
          			    }
          			}
              }
            }
        },
        "additional_charge": {
          "type": "nested",
          "properties":{
            "charge_name": {
          	  "type": "text"
          	},
          	"option_name": {
          	  "type": "text"
          	},
          	"moq": {
          	  "type": "text"
          	},
            "price_range" : {
                "type": "nested",
                "properties":{
                  "qty": {
                    "type": "integer_range"
                   },
                  "price": {
                    "type": "double"
                  },
                  "net_price": {
                    "type": "double"
                  }
              }
            }
          }
        },
        "images": {
          "properties": {
            "color": {
          	   "type": "text"
            },
            "web_image": {
              "type": "text"
            }
          }
        },
        "shipping": {
          "properties": {
            "fob_city": {
              "type": "text"
            },
            "fob_state_code": {
              "type": "text"
            },
            "fob_country_code": {
              "type": "text"
            },
            "fob_zip_code": {
              "type": "text"
            },
            "shipping_qty_per_carton": {
              "type": "double"
            },
            "carton_length": {
              "type": "double"
            },
            "carton_width": {
              "type": "double"
            },
            "carton_height": {
              "type": "double"
            },
            "carton_weight": {
              "type": "double"
            },
            "product_length": {
              "type": "double"
            },
            "product_width": {
              "type": "double"
            },
            "product_height": {
              "type": "double"
            },
            "product_weight": {
              "type": "double"
            },
            "carton_size_unit": {
              "type": "double"
            },
            "carton_weight_unit": {
              "type": "double"
            },
            "product_size_unit": {
              "type": "double"
            },
            "product_weight_unit": {
              "type": "double"
            }
          }
        },
        "supplier_id": {
          "type": "string"
        },
        "video_url": {
          "type": "string"
        },
        "vid": {
          "type": "text",
          "fields": {
            "raw": {
              "type": "keyword"
            }
          }
        },
        "features": {
          "properties": {
            "label": {
              "type": "text"
            },
            "value": {
              "type": "text",
              "fields": {
                "english": {
                  "type": "text",
                  "analyzer": "english"
                }
              }
            }
          }
        },
        "pricing": {
          "properties": {
            "type": {
              "type": "text",
              "fields": {
                "raw": {
                  "type": "keyword"
                },
                "english": {
                  "type":     "text",
                  "analyzer": "english"
                }
              }
            },
            "global_price_type": {
              "type": "text",
              "fields": {
                "raw": {
                  "type": "keyword"
                },
                "english": {
                  "type":     "text",
                  "analyzer": "english"
                }
              }
            },
            "price_unit": {
              "type": "text",
              "fields": {
                "raw": {
                  "type": "keyword"
                },
                "english": {
                  "type":     "text",
                  "analyzer": "english"
                }
              }
            },
            "price_range" : {
        		    "type": "nested",
        		    "properties":{
        			    "qty": {
        				"type": "integer_range"
        			     },
        			    "price":{
        			      "type": "double"
        			    }
        			}
            }
          }
        }
      }
    }
  }
}
