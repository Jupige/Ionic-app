import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { IDataStateProvider } from "./mode.new/data-state.provider.interface";
import { RowDataModel } from "./mode.new/row-data.model";
import { IDataSate } from "./mode.new/data-state.interface";
import { CellDataModel } from "./mode.new/cell-data.model";
import { IDataRule } from "./mode.new/data-rule.interface";


@Component({
  selector: 'page-about',
  templateUrl: 'about.new.html',
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage implements OnInit {
  colums: string[] = [];
  dataSource: RowDataModel[] = [];

  constructor(
    public navCtrl: NavController,
    private cd: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.initDatas();
  }

  private initDatas() {
    let isInitColumns = false;
    let objs = [];
    for (let i = 0; i < 5; i++) {
      objs.push(this.generatePerson());
    }

    objs.forEach(obj => {
      this.dataSource.push(this.objToRowData(obj));
    });

    this.update();
  }

  private objToRowData(obj: Object) {
    let isInitColumns: false;
    let r = new RowDataModel(
      SimpleDataStateProvider.DEFAULT,
      obj,
      [SimpleDataRule.DEFAULT]);

    if (!isInitColumns) {
      this.colums = Object.keys(obj);
    }

    this.colums.forEach(k => {
      (<CellDataModel>r.cells[k]).setDataStatable(
        null,
        SimpleDataStateProvider.DEFAULT,
        [SimpleDataRule.DEFAULT]);
    });

    return r;
  }

  private generatePerson(): Object {
    return {
      name: this.randomString('jupige'),
      age: this.randomNumber(),
      address: this.randomString('address'),
      height: this.randomNumber(),
    }
  }

  private randomString(prifix: string) {
    return `${prifix}-${this.randomNumber()}`;
  }

  private randomNumber() {
    return Math.floor(Math.random() * 100);
  }


  private changeFirstData() {
    console.log('changeFirstData');

    this.dataSource[0].updateByRowObj(this.generatePerson());

    this.update();
  }

  private addOneData() {
    console.log('addOneData');
    let newRow = this.generatePerson();
    console.log(newRow);
    this.dataSource.push(this.objToRowData(newRow));
    this.update();
  }

  private removeOneData() {
    this.dataSource.splice(0, 1);
    this.update();
  }

  private update() {
    this.cd.markForCheck();
  }
}


export class SimpleDataRule implements IDataRule {

  public static DEFAULT: SimpleDataRule = new SimpleDataRule();

  applyCellState(row: RowDataModel, cell: CellDataModel): IDataSate {
    if (cell.currentValue !== cell.preValue) {
      console.log(cell);
      let to = setTimeout((cell) => {
        console.log(cell);
        let s = cell && <any>cell.state;
        if (!s || !s.dirty)
          return;

        s.class = 'dirty-red-cell';
      }, 2000,cell);

      return {
        class: 'dirty-yellow-cell',
        dirty: true,
        id: +new Date()
      }
    }
  }

  applyRowState(row: RowDataModel): IDataSate {
    if (!row.cells)
      return {};

    let tmpCells = row.cells;
    let dirtyLength = Object.keys(tmpCells)
      .map(c => <CellDataModel>tmpCells[c])
      .filter(cm => cm.state && (<any>cm.state).dirty)
      .length;

    if (dirtyLength >= 2) {
      let to = setTimeout((row) => {
        console.log(row);
        let s = row && <any>row.state;
        if (!s || !s.dirty)
          return;

        s.class = 'no-dirty';
      }, 2000);

      return {
        class: 'more-dirty',
        dirty: true
      }
    }
  }
}

export class SimpleDataStateProvider implements IDataStateProvider {

  public static DEFAULT: SimpleDataStateProvider = new SimpleDataStateProvider();

  nextCellState(row: RowDataModel, cell: CellDataModel): IDataSate {
    if (row && cell && cell.rules) {
      return cell.rules[0].applyCellState(row, cell);
    }

    return null;
  }

  nextRowState(row: RowDataModel): IDataSate {
    if (row && row.rules) {
      return row.rules[0].applyRowState(row);
    }

    return null;
  }

}