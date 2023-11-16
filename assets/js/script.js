
let tableHead=document.getElementById('tableHead');
let tableBody=document.getElementById('tableBody');
let ti=document.getElementById('ti');

let uName=document.getElementById('uName').value;
let uPassword=document.getElementById('loginPassword').value;

async function loginAuth()
{
  let userResponse=await  fetch("/login");
  let userData= await userResponse.json();
  console.log(userData);

}
loginAuth();

function display_t(){
    var refresh=1000; // Refresh rate in milli seconds
    mytime=setTimeout('display_time()',refresh)
 }
 
 function display_time() {
   var CDate = new Date();
   var NewDate=CDate.toDateString(); 
   NewDate = NewDate + " - " + CDate.toLocaleTimeString();
   ti.innerHTML = NewDate;
   display_t();
 }

function buildingTableHead()
{
    var cartoona=`<tr>
    <th class='bg-secondary'>ID</th>
    `;
    for(let i=0;i<26;i++)
    {
        var ch=String.fromCharCode(65+i);
        cartoona+=`<th class='bg-warning'>${ch}</th>`;
    }
    cartoona+=`</tr>`;
    tableHead.innerHTML=cartoona;
}

function buildingTableBody()
{
    var cartoona=``;
    for(let i=0;i<16;i++)
    {
        cartoona+=`<tr>`
        for(let j=0;j<=26;j++)
        {
            if(j==0)
            {
                cartoona+=`<td class='bg-warning'>${i+1}</td>`
            }
            else
            {
            cartoona+=`<td></td>`;
            }

        }
        cartoona+=`</tr>`;
    }
    tableBody.innerHTML=cartoona;
}
buildingTableHead();
buildingTableBody();