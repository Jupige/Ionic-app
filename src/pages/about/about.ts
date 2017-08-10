import { DxDataGridComponent } from 'devextreme-angular';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AboutService } from './services/about.service';
import { Deferred } from 'jquery';
import { MakeMarketOrder } from "./model/make-market";

@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
  providers: [AboutService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage implements OnInit, AfterViewInit {

  @ViewChild(DxDataGridComponent) dg: DxDataGridComponent;
  orders: MakeMarketOrder[] = [];
  orderColumns: string[] = ['orderId', 'name', 'amount'];

  constructor(public navCtrl: NavController, private sev: AboutService, private cd: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.initDatas();
  }


  ngAfterViewInit(): void {

  }

  private initDatas() {
    let isInitColumns = false;
    let su = this.sev.getPersionsAsync()
      .subscribe(p => {
        if (this.orders.length > 4) {
          su.unsubscribe();
        } else {
          this.orders.push(MakeMarketOrder.generate(this.orderColumns));
          this.update();
        }
      });
  }

  private changeFirstData() {
    console.log('changeFirstData');
    // setInterval(() => {
    let od = MakeMarketOrder.generate(this.orderColumns);
    console.log(od);
    this.orders[0].updateOrderBySystem([
      od.orderItems[this.orderColumns[0]],
      od.orderItems[this.orderColumns[1]]
    ]);
    this.update();
    // }, 1);
  }

  private addOneData() {
    console.log('addOneData');
    let od = MakeMarketOrder.generate(this.orderColumns);
    console.log(od);
    this.orders.unshift(od);
    // this.update();
  }

  private removeOneData() {
    // this.orders.splice(0, 1);
    // this.update();
  }

  onEditingStart(e: Object) {
    console.log('onEditingStart');
    console.log(e);
  }


  onRowUpdating(info: any) {
    debugger;
    console.log('onRowUpdating');
    console.log(info);

    if (!Object.keys(info.newData) || !(info.oldData instanceof MakeMarketOrder))
      return;

    info.oldData.updateOrderByPerson(
      Object.keys(info.newData)
        .map(cellKey => {
          let r = { fieldName: cellKey, currentValue: info.newData[cellKey] };
          return r;
        }));
    info.oldData.updateOrderByPerson([{ fieldName: 'orderId', currentValue: 'orderId00' }]);
  }

  onRowUpdated(info: any) {
    console.log('onRowUpdated');
    console.log(info);
  }

  calculateCellValue(rowData: any) {
    console.log('calculateCellValue');
    console.log(rowData);
    if (!(rowData instanceof MakeMarketOrder))
      return;

    return rowData.orderItems[(<any>this).dataField].currentValue;
  }

  onDisposing(e: Object) {
    console.log(e);
  }

  private update() {
    this.cd.markForCheck();
  }
}


// read me :
// way 1 :
// calculateCellValue  ->  converter column values to real value
// onRowUpdating -> sync ui datas to real cloumn values
// reauls :
// a : update a cell or mutil cells from ui, or update a cell and update more cells behinde .ts,correctly update ui. but, update one row.
// b : behinde .ts, update on cell,the ui update one [ROW].
// c : cell class ,no way to add to cell. 

// way 2:
// cellTemplate -> can add color or cssClass to cell
// order.cell.pipe -> can pipe column result to real result.
// onRowUpdating -> sync ui datas to real cloumn values
// result : 
// a : update a cell or mutil cells from ui, or update a cell and update more cells behinde .ts,correctly update ui. but, update one row.
// b : behinde .ts, update on cell,the ui update one [CELL].
// c : cell class ,has way to add to cell. 
