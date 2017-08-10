import { RowDataModel } from "./row-data.model";
import { IDataSate } from "./data-state.interface";
import { CellDataModel } from "./cell-data.model";

export interface IDataStateProvider {
    nextCellState(row: RowDataModel, cell: CellDataModel): IDataSate;
    nextRowState(row: RowDataModel) : IDataSate;
}