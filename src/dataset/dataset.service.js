'use strict';

var datasets = [{
  name: 'Barley',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Budget 2016',
  url: 'data/budget.json',
  id: 'budget',
  group: 'sample'
},{
  name: 'Climate Normals',
  url: 'data/climate.json',
  id: 'climate',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}];

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, field) {
    m[field.name] = field;
    return m;
  }, {});
}

angular.module('vlui').factory('Dataset', [
  '$http', '$q', 'Alerts', '_', 'dl', 'vl',
  function($http, $q, Alerts, _, dl, vl) {
    var Dataset = {};

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

  var typeOrder = {
    N: 0,
    O: 0,
    G: 2,
    T: 3,
    Q: 4
  };

  Dataset.fieldOrderBy = {};

  Dataset.fieldOrderBy.type = function(field) {
    if (field.aggregate==='count') return 4;
    return typeOrder[field.type];
  };

  Dataset.fieldOrderBy.typeThenName = function(field) {
    return Dataset.fieldOrderBy.type(field) + '_' +
      (field.aggregate === 'count' ? '~' : field.name.toLowerCase());
      // ~ is the last character in ASCII
  };

  Dataset.fieldOrderBy.original = function() {
    return 0; // no swap will occur
  };

  Dataset.fieldOrderBy.name = function(field) {
    return field.name;
  };

  Dataset.fieldOrderBy.cardinality = function(field, stats) {
    return stats[field.name].distinct;
  };

  Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

  Dataset.getSchema = function(data, stats, order) {
    var types = dl.type.inferAll(data),
      schema = _.reduce(types, function(s, type, name) {
        var field = {
          name: name,
          type: vl.data.types[type],
          primitiveType: type
        };

        if (field.type === 'Q' && stats[field.name].distinct <= 5) {
          field.type = 'O';
        }

        s.push(field);
        return s;
      }, []);

    schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.name);

    schema.push(vl.field.count());
    return schema;
  };

  // update the schema and stats
  Dataset.onUpdate = [];

  Dataset.update = function(dataset) {
    var updatePromise;

    if (dataset.values) {
      updatePromise = $q(function(resolve, reject) {
        // jshint unused:false
        Dataset.type = undefined;
        Dataset.updateFromData(dataset, dataset.values);
        resolve();
      });
    } else {
      updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
        var data;

        // first see whether the data is JSON, otherwise try to parse CSV
        if (_.isObject(response.data)) {
           data = response.data;
           Dataset.type = 'json';
        } else {
          data = dl.read(response.data, {type: 'csv'});
          Dataset.type = 'csv';
        }

        Dataset.updateFromData(dataset, data);
      });
    }

    Dataset.onUpdate.forEach(function(listener) {
      updatePromise = updatePromise.then(listener);
    });

    return updatePromise;
  };

  Dataset.updateFromData = function(dataset, data) {
    Dataset.data = data;

    Dataset.currentDataset = dataset;
    Dataset.stats = vl.data.stats(Dataset.data);

    for (var fieldName in Dataset.stats) {
      if (fieldName !== '*') {
        Dataset.stats[fieldName].sample = _.sample(_.pluck(Dataset.data, fieldName), 7);
      }
    }

    Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
    Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
  };

  Dataset.add = function(dataset) {
    if (!dataset.id) {
      dataset.id = dataset.url;
    }
    datasets.push(dataset);

    return dataset;
  };

  return Dataset;
}
]);
