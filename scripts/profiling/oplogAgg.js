/*
 - deletion only includes the _id, could get average doc size to calculate
 - could include index keys for each collection too to have better IOP expenditure
 - update includes additional fields in o object
*/

function generateWindows(start, end, interval) {
  var result = [];
  let current = new Date(start);
  var endDate = new Date(end);
  while (current <= endDate) {
    result.push(new Date(current));
    current = new Date(current.getTime() + interval * 60000);
  }
  return result;
}


module.exports = {
  oplogAgg: function (times, ns) {

    var windows = generateWindows(times[0], times[1], 5);

    return [
      {
        $match: {
          op: {
            $in: [
              "i",
              "u",
              "d"
            ]
          },
          ns: ns,
        }
      },
      {
        $sort: {
          wall: 1
        }
      },
      {
        $project: {
          op: 1,
          ns: 1,
          wall: 1,
          _id: 0,
        }
      },
      {
        $bucket: {
          groupBy: "$wall",
          boundaries: windows,
          default: "Other",
          output: {
            ns: {$first: "$ns"},
            totalWrites: {
              $sum: 1
            },
            insert: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$op", "i"]
                  },
                  1,
                  0
                ]
              }
            },
            update: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$op", "u"]
                  },
                  1,
                  0
                ]
              }
            },
            remove: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$op", "d"]
                  },
                  1,
                  0
                ]
              }
            },
            // records: { $push: "$$ROOT" }
          }
        }
      }
    ]
  }
}
