'use strict';

angular.module('codeChallengeApp')
  .controller('MainCtrl', function ($scope, $http) {

      var getNumDays = function(date1, date2){
        // The number of milliseconds in one day
        var ONE_DAY = 1000 * 60 * 60 * 24

        // Convert both dates to milliseconds
        var date1_ms = date1.getTime()
        var date2_ms = date2.getTime()

        // Calculate the difference in milliseconds
        var difference_ms = Math.abs(date1_ms - date2_ms)

        // Convert back to days and return
        return Math.ceil(difference_ms/ONE_DAY)
      }

      var fillArray = function(len, value) {
        var retArr = [];

        _.times(len, function(){
          retArr.push(value)
        })
        return retArr;
      }

      var getUserById = function(id) {
        return _($scope.users).find(function(record){
          return record.id == id;
        })
      }

      var renderCharts = function() {
        var labelArr = fillArray($scope.range.num_days, '');

        $('[data-user-id]').each(function(){

          var $canvas = $('<canvas></canvas>');
          $(this).find('canvas').replaceWith($canvas);

          var ctx = $canvas.get(0).getContext('2d'),
              user_id = parseInt($(this).attr('data-user-id')),
              user = getUserById(user_id),
              cData = user.chart_data.conversions,
              iData = user.chart_data.impressions;

          $canvas.attr({
            height: $canvas.height(),
            width: $canvas.width()
          })

          var chart = new Chart(ctx).Line({
            labels : labelArr,
            datasets : [
              {
                fillColor : "transparent",
                strokeColor : "#2980b9",
                pointColor : "transparent",
                pointStrokeColor : "transparent",
                data : cData
              },
              {
                fillColor : "transparent",
                strokeColor : "#e67e22",
                pointColor : "transparent",
                pointStrokeColor : "transparent",
                data : iData
              }
            ]
          }, {
            scaleLineColor: 'transparent',
            scaleShowGridLines: false,
            scaleShowLabels: false,
            animation: false
          });

        })
      }

      // Get Data
     $http.get('/data/users.json').success(function(data){
      $scope.users = data;

      $http.get('/data/logs.json').success(function(data){
        var userLog = [],
            timeNow = new Date().getTime(),
            range = {
              date_min: timeNow, 
              date_max: 0,
              num_days: 0,
              date_min_moment: 0,
              date_max_moment: 0
            },
            mMin,
            mMax;

        // iterate through impressions and clicks
        _(data).each(function(elem, index, list){ 

          var cElem,
              elem_date = new Date(elem.time);

          // init array with user_id as index
          if(!userLog[elem.user_id]){
            
            userLog[elem.user_id] = {
              impressions: [],
              conversions: [],
              revenue: 0
            };
          }

          cElem = userLog[elem.user_id];
          cElem.revenue += elem.revenue;

          // impressions, conversions
          cElem[elem.type+'s'].push(new Date(elem.time));

          // set min-max if outside of current range
          range.date_min = (range.date_min < elem_date) ? range.date_min : elem_date;
          range.date_max = (range.date_max > elem_date) ? range.date_max : elem_date;
        });

        // update range with span between date_max and date_min
        // set min-max times to start of day and end of day, in order to effectively get diff in days
        range.date_min_moment = moment(range.date_min).hours(0).minutes(0).seconds(0).milliseconds(0);
        range.date_max_moment = moment(range.date_max).hours(24).minutes(59).seconds(59).milliseconds(999);
        range.num_days = range.date_max_moment.diff(range.date_min_moment, 'days');

        // attach logs data to $scope.users
        $scope.userLogs = userLog;
        $scope.range = range;

        // loop through each user and create chart data
        _($scope.users).each(function(elem, index, list) {

          // add logs to user scope
          var cUserLogs = $scope.users[index].logs = userLog[elem.id];
          var uIndex = index;
          var cd = $scope.users[uIndex]['chart_data'] = [];  

          // make chart data for impressions and conversions
          _(['impressions', 'conversions']).each(function(elem, index, list){
            var type = elem;
            
            // put count in days on range and zero-fill
            cd[type] = fillArray(range.num_days, 0);

            // increment count for conversions and impressions
            _(cUserLogs[elem]).each(function(elem, index, list){

              // getNumDays seems to be faster than working with moment in this case
              var posInRange = getNumDays(range.date_min, elem);
              cd[type][posInRange]++;
            });
          });
        });

        renderCharts();

        $(window).bind('resize', _.debounce(renderCharts, 100));
        

        $scope.getRandomClass = function() {
          return 'bg-' + _.random(1, 5);
        }

      });
    });
   
  });
