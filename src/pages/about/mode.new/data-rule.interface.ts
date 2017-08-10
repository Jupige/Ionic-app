import { RowDataModel } from "./row-data.model";
import { IDataSate } from "./data-state.interface";
import { CellDataModel } from "./cell-data.model";

export interface IDataRule {
    applyCellState(row: RowDataModel, cell: CellDataModel): IDataSate;
    applyRowState(row: RowDataModel): IDataSate;
}