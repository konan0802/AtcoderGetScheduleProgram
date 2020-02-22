function dataGetFunction(){
  var judge=0;
  var url = 'https://atcoder.jp/?lang=ja';
  var response = UrlFetchApp.fetch(url);
  var html = response.getContentText('UTF-8');
  
  //最新コンテストリストの先頭の探索
  var searchTag = '<ul class="m-list_contest">';
  var index = html.indexOf(searchTag);
  
  if (index !== -1) {
    //最新コンテスト以降のHTML
    var html = html.substring(index + searchTag.length);
    //最新コンテストリストの文末の探索
    var index = html.indexOf('</ul>');
  }else{
    judge=1;
  }
  if (index !== -1) {
    //最新コンテスト部分のHTML
    var allContestHtml = html.substring(0, index);
    var count = (allContestHtml.match(/<li>/g) || []).length;
    
    var result = [];
    
    for (var i=0; i<count; i++){
      //先頭のコンテストの探索
      var startIndex = allContestHtml.indexOf('<li>');
      var endIndex = allContestHtml.indexOf('</li>');
      var targetHtml = allContestHtml.substring(startIndex, endIndex);
      allContestHtml = allContestHtml.substring(endIndex + '</li>'.length);
      //データの成形
      var contestInfo = dataArrange(targetHtml);
      if (contestInfo[0] !== '終了'){
        result.push(contestInfo);
      }
    }
  }else{
    judge=1;
  }
  return result;
}

//データの成形
function dataArrange(targetHtml){
  var judge=0;
  
  //statusの取得
  var startStatusTag = '<div class="status">';
  //statusのインデックスの取得
  var startStatusIndex = targetHtml.indexOf(startStatusTag);
  //[終了]だった場合は
  if (startStatusIndex == -1) {
    startStatusTag = '<div class="status status-gray">';
    startStatusIndex = targetHtml.indexOf(startStatusTag);
  }
  var endStatusIndex = targetHtml.indexOf('</div>');
  //値が取得できたかどうか
  if (startStatusIndex !== -1 && endStatusIndex !== -1){
    //statusの取得
    var status = targetHtml.substring(startStatusIndex + startStatusTag.length, endStatusIndex);
  }else{
    judge=1;
  }
  
  //時間の取得
  var startDTIndex = targetHtml.indexOf("<time class='fixtime fixtime-short'>");
  var endDTIndex = targetHtml.indexOf('</time>');
  //値が取得できたかどうか
  if (startDTIndex !== -1 && endDTIndex !== -1){
    //日時の取得
    var dayTime = targetHtml.substring(startDTIndex+"<time class='fixtime fixtime-short'>".length, endDTIndex);
    //日のインデックスの取得
    var endDayIndex = dayTime.indexOf(' ');
    //時間のインデックスの取得
    var startTimeIndex = endDayIndex+1;
    var endTimeIndex = dayTime.indexOf('+');
    //値が取得できたかどうか
    if (endDayIndex !== -1 && startTimeIndex !== -1 && endTimeIndex !== -1){
      //日の取得
      var day = dayTime.substring(0, endDayIndex);
      day = day.replace('-', '/');
      day = day.replace('-', '/');
      //時間の取得
      var time = dayTime.substring(startTimeIndex, endTimeIndex);
    }else{
      judge=1;
    }
  }else{
    judge=1;
  }
  
  //Ratedの取得
  //Ratedのインデックスの取得
  var startRatedIndex = targetHtml.indexOf('<span>');
  var endRatedIndex = targetHtml.indexOf('</span>');
  //値が取得できたかどうか
  if (startRatedIndex !== -1 && endRatedIndex !== -1){
    //Ratedの取得
    var rated = targetHtml.substring(startRatedIndex + '<span>'.length, endRatedIndex);
  }else{
    judge=1;
  }
  
  //contestNameの取得
  //contestNameのインデックスの取得
  var startNameIndex = targetHtml.indexOf('<div class="m-list_contest_ttl">');
  var contestNameHtml = targetHtml.substring(startNameIndex + '<div class="m-list_contest_ttl">'.length);
  
  var startNameIndex = contestNameHtml.indexOf('<a href=');
  var contestNameHtml = contestNameHtml.substring(startNameIndex);
  
  var endNameIndex = contestNameHtml.indexOf('</a>');
  //値が取得できたかどうか
  if (startNameIndex !== -1 && endNameIndex !== -1){
    //contestNameの取得
    var contestName = contestNameHtml.substring(0, endNameIndex);
    //タグの除去
    contestName = contestName.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
  }else{
    judge=1;
  }
  return [status, day, time, rated, contestName];
}

//既存データとの重なり比較とデータのセット
function dataSetFunction(sheetData, rowStartData, newContestlist){
  //新しく追加するデータのリスト
  newDataList = [];
  
  var contestsIndex=0;
  newContestlist.forEach(function(eachContestList) {
    //チェック
    var check=0;
    
    //既存データの探索
    for(var i=2; i<rowStartData; i+=1){
      var existingContestName = sheetData.getRange(i,5).getValue();
      //データの比較（同じデータがあればcheckを1に）
      if(existingContestName == eachContestList[4]){
        check=1;
      }
    }
    //checkが０のままの場合はデータのセット
    if(check==0){
      eachContestList.forEach(function(eachContestInfo, infoIndex) {
        sheetData.getRange(rowStartData+contestsIndex, infoIndex+1).setValue(eachContestInfo);
      });
      contestsIndex++;
      newDataList.push(eachContestList);
    }
  });
  return newDataList;
}

//新規追加データからイベントを作成→カレンダーにアップロード
function createEvents(newDataList){
  newDataList.forEach(function(newData) {
    //カレンダー取得
    var calendar = CalendarApp.getDefaultCalendar();
    var title = newData[4];
    var startTime = new Date(newData[1]+' '+newData[2]);
    var endTime = new Date(newData[1]+' '+newData[2]);
    endTime.setHours(startTime.getHours()+1);
    var option = {
      description: newData[3]
    }
    //カレンダーにアップロード
    var calEvent = calendar.createEvent(title, startTime, endTime, option);
    calEvent.setColor(CalendarApp.EventColor.ORANGE);
  });
}

//１ヶ月過ぎたデータを削除
function deleteContest(sheetData, rowStartData){
  var thresholdTime = new Date();
  thresholdTime.setHours(thresholdTime.getDate() - 60);
  //データの探索
  for(var i=2; i<rowStartData; i+=1){
    var existingContestTime = sheetData.getRange(i,2).getValue();
    //データの日にちの比較
    if(existingContestTime <= thresholdTime){
      //データの削除
      sheetData.deleteRows(i);
    }
  }
}

function main(){
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = book.getSheetByName("シート1");
  //追加を始める行
  var rowStartData = sheetData.getDataRange().getLastRow() + 1;
  //Atcoderからコンテスト情報を取得
  var newContestlist = dataGetFunction();
  //取得したコンテストデータを既存のDBと比較　→　新規追加データを選択＆格納
  var newDataList = dataSetFunction(sheetData, rowStartData, newContestlist);
  //新規追加データからイベントを作成→カレンダーにアップロード
  createEvents(newDataList);
  //60日経ったコンテストは削除
  deleteContest(sheetData, rowStartData);
}